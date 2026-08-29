use std::fs;
use std::path::Path;
use std::process::Command;

#[tauri::command]
async fn play_anime(
    title: String,
    episode: Option<u32>,
    is_dub: bool,
    quality: String,
    skip_intro: bool,
    start_time: Option<u32>,
) -> Result<String, String> {
    println!(
        "[PAL] title={} ep={:?} dub={} quality={} skip={} start={:?}",
        title, episode, is_dub, quality, skip_intro, start_time
    );

    let target_ep_str = match episode {
        Some(ep) => format!("{}", ep),
        None => String::new(),
    };

    // 1. Write Lua tracker script to measure watched percentage, exact time position, and completion
    let lua_script = r#"
local max_percent = 0
local last_time_pos = 0
local total_duration = 0
local media_title = ""

mp.observe_property("percent-pos", "number", function(name, val)
    if val and val > max_percent then
        max_percent = val
    end
end)

mp.observe_property("time-pos", "number", function(name, val)
    if val and val > 0 then
        last_time_pos = val
    end
end)

mp.observe_property("duration", "number", function(name, val)
    if val and val > 0 then
        total_duration = val
    end
end)

mp.observe_property("media-title", "string", function(name, val)
    if val and val ~= "" then
        media_title = val
    end
end)

local function log_progress(event_reason)
    local completed = (max_percent >= 70) or (event_reason == "eof")
    local paths = {"C:\\tmp\\pal_tracker.log", "/tmp/pal_tracker.log"}
    for _, p in ipairs(paths) do
        local f = io.open(p, "a")
        if f then
            f:write(string.format("TRACK:%.2f:%s:%.0f:%.0f:%s\n", 
                max_percent, 
                tostring(completed), 
                last_time_pos, 
                total_duration, 
                media_title:gsub(":", "-")))
            f:close()
        end
    end
    max_percent = 0
    last_time_pos = 0
end

mp.register_event("end-file", function(event)
    log_progress(event and event.reason or "")
end)

mp.register_event("shutdown", function()
    log_progress("shutdown")
end)
"#;

    // Ensure C:\tmp exists
    let _ = fs::create_dir_all("C:\\tmp");
    let _ = fs::write("C:\\tmp\\pal_tracker.lua", lua_script);
    let _ = fs::remove_file("C:\\tmp\\pal_tracker.log");

    if let Ok(appdata) = std::env::var("APPDATA") {
        let mpv_scripts = Path::new(&appdata).join("mpv").join("scripts");
        let _ = fs::create_dir_all(&mpv_scripts);
        let _ = fs::write(mpv_scripts.join("pal_tracker.lua"), lua_script);
    }

    // 2. Write Python universal resolver directly to C:\tmp\pal_launcher.py
    let py_launcher = r#"import sys
import os
import re
import subprocess
import urllib.parse

query = sys.argv[1] if len(sys.argv) > 1 else ""
desired_ep_str = sys.argv[2] if len(sys.argv) > 2 else ""
desired_ep = int(desired_ep_str) if desired_ep_str.isdigit() else None
is_dub = sys.argv[3].lower() == "true" if len(sys.argv) > 3 else False
quality = sys.argv[4] if len(sys.argv) > 4 else "best"
skip_intro = sys.argv[5].lower() == "true" if len(sys.argv) > 5 else False

print(f"[PAL Engine] Starting playback for: '{query}' (Season Episode: {desired_ep or 'Interactive'})")

for p in ["/mnt/c/tmp/pal_tracker.log", "/tmp/pal_tracker.log"]:
    try:
        if os.path.exists(p):
            os.remove(p)
    except Exception:
        pass

curl_bin = "curl"
for c in ["curl_chrome116", "curl_chrome110", "curl"]:
    if subprocess.call(["which", c], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        curl_bin = c
        break

agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
encoded = urllib.parse.quote(query)
search_url = f"https://anidb.app/browse?q={encoded}"

selected_index = None
selected_id = None
selected_name = None
resolved_ep = str(desired_ep) if desired_ep else None

try:
    cmd = [curl_bin, "-sL", "-A", agent, "--max-time", "10", search_url]
    page = subprocess.check_output(cmd).decode("utf-8", errors="ignore")
    matches = re.findall(r'anime/([a-z0-9-]+-[0-9]+)"[^>]*(?:title|alt)="([^"]+)"', page)
    if not matches:
        raw_ids = re.findall(r'anime/([a-z0-9-]+-[0-9]+)"', page)
        matches = [(m, m) for m in raw_ids]
    if matches:
        clean_q = re.sub(r'[^a-zA-Z0-9]', '', query).lower()
        for idx, (mid, mname) in enumerate(matches, start=1):
            clean_n = re.sub(r'[^a-zA-Z0-9]', '', mname).lower()
            if clean_n == clean_q:
                selected_index = idx
                selected_id = mid
                selected_name = mname
                break
        
        if not selected_id and matches:
            selected_index = 1
            selected_id = matches[0][0]
            selected_name = matches[0][1]

    if selected_id and desired_ep:
        anime_num = selected_id.split("-")[-1]
        ep_url = f"https://anidb.app/api/frontend/anime/{anime_num}/episodes"
        ep_json_raw = subprocess.check_output([curl_bin, "-sL", "-A", agent, ep_url]).decode("utf-8", errors="ignore")
        ep_numbers = re.findall(r'"number":\s*([0-9]+)', ep_json_raw)
        if ep_numbers:
            idx = desired_ep - 1
            if 0 <= idx < len(ep_numbers):
                resolved_ep = ep_numbers[idx]
                print(f"[PAL Engine] Auto-mapped Season Episode {desired_ep} -> Scraper Episode {resolved_ep} ({selected_name})")
except Exception as e:
    print(f"[PAL Engine] Resolver note: {e}")

ani_cli_cmd = ["ani-cli", "--no-detach"]
if is_dub:
    ani_cli_cmd.append("--dub")
if quality and quality != "best":
    ani_cli_cmd.extend(["-q", quality])
if skip_intro:
    ani_cli_cmd.append("--skip")

if selected_index and resolved_ep:
    full_cmd = ani_cli_cmd + ["-S", str(selected_index), "-e", str(resolved_ep), query]
elif resolved_ep:
    full_cmd = ani_cli_cmd + ["-e", str(resolved_ep), query]
else:
    full_cmd = ani_cli_cmd + [query]

print(f"[PAL Engine] Launching ani-cli: {' '.join(full_cmd)}")
try:
    subprocess.call(full_cmd)
except Exception as err:
    print(f"[PAL Engine] Playback failed: {err}")
    subprocess.call(["ani-cli", "--no-detach", query])

print("\n[PAL Companion] Playback session ended. Press Enter to close window...")
try:
    input()
except Exception:
    pass
"#;

    let _ = fs::write("C:\\tmp\\pal_launcher.py", py_launcher);

    // 3. Configure player flags
    let mut player_flags = String::from("--script=C:\\\\tmp\\\\pal_tracker.lua");
    if let Some(st) = start_time {
        if st > 15 {
            player_flags.push_str(&format!(" --start={}", st));
        }
    }

    // 4. Write runner script to C:\tmp\pal_run.sh
    let run_sh = format!(
        "#!/bin/bash\nmkdir -p /mnt/c/tmp /tmp ~/.config/mpv/scripts && cp /mnt/c/tmp/pal_tracker.lua ~/.config/mpv/scripts/pal_tracker.lua 2>/dev/null || true\nexport ANI_CLI_PLAYER_FLAGS='{}'\npython3 /mnt/c/tmp/pal_launcher.py '{}' '{}' '{}' '{}' '{}'\n",
        player_flags,
        title.replace("'", "'\\''"),
        target_ep_str,
        is_dub,
        quality,
        skip_intro
    );

    let _ = fs::write("C:\\tmp\\pal_run.sh", run_sh);

    // 5. Execute in a visible terminal window
    let _ = Command::new("cmd")
        .arg("/C")
        .arg("start")
        .arg("PAL Companion")
        .arg("/WAIT")
        .arg("wsl")
        .arg("bash")
        .arg("/mnt/c/tmp/pal_run.sh")
        .status()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    // 6. Read the tracker log
    let log_content = fs::read_to_string("C:\\tmp\\pal_tracker.log").unwrap_or_else(|_| {
        let out = Command::new("wsl")
            .arg("bash")
            .arg("-c")
            .arg("cat /mnt/c/tmp/pal_tracker.log 2>/dev/null || cat /tmp/pal_tracker.log 2>/dev/null || true")
            .output();
        out.map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default()
    });

    println!("[PAL] Tracker log content: {:?}", log_content);

    let mut completed_count: u32 = 0;
    let mut max_percent: f64 = 0.0;
    let mut last_time_pos: u32 = 0;
    let mut duration: u32 = 0;
    let mut last_completed_ep: Option<u32> = None;

    for line in log_content.lines() {
        if line.starts_with("TRACK:") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 5 {
                let percent: f64 = parts[1].parse().unwrap_or(0.0);
                if percent > max_percent {
                    max_percent = percent;
                }
                let is_completed = parts[2] == "true" || percent >= 70.0;
                let pos: u32 = parts[3].parse().unwrap_or(0);
                let dur: u32 = parts[4].parse().unwrap_or(0);

                if pos > last_time_pos {
                    last_time_pos = pos;
                }
                if dur > duration {
                    duration = dur;
                }

                if is_completed {
                    completed_count += 1;

                    if parts.len() >= 6 {
                        let title_part = parts[5..].join(":");
                        let re_words: Vec<&str> = title_part.split_whitespace().collect();
                        for i in 0..re_words.len() {
                            let w = re_words[i].to_lowercase();
                            if (w == "episode" || w == "ep") && i + 1 < re_words.len() {
                                if let Ok(ep_num) = re_words[i + 1].parse::<u32>() {
                                    if last_completed_ep.map_or(true, |prev| ep_num > prev) {
                                        last_completed_ep = Some(ep_num);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let json_res = match last_completed_ep {
        Some(ep) => format!(
            r#"{{"completed_count": {}, "last_completed_ep": {}, "max_percent": {:.2}, "last_time_pos": {}, "duration": {}}}"#,
            completed_count, ep, max_percent, last_time_pos, duration
        ),
        None => format!(
            r#"{{"completed_count": {}, "last_completed_ep": null, "max_percent": {:.2}, "last_time_pos": {}, "duration": {}}}"#,
            completed_count, max_percent, last_time_pos, duration
        ),
    };

    println!("[PAL] Playback tracking result: {}", json_res);
    Ok(json_res)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![play_anime])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
