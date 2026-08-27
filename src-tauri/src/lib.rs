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

    // Build the ani-cli flags
    let mut flags = String::from(" --no-detach"); // keep terminal alive during playback
    if let Some(ep) = episode {
        flags.push_str(&format!(" -e {}", ep));
    }
    if is_dub {
        flags.push_str(" --dub");
    }
    if quality != "best" {
        flags.push_str(&format!(" -q {}", quality));
    }
    if skip_intro {
        flags.push_str(" --skip");
    }

    // Lua tracker script to measure watched percentage, exact time position, and completion
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

    // Ensure C:\tmp directory exists and write pal_tracker.lua for Windows mpv.exe
    let _ = fs::create_dir_all("C:\\tmp");
    let _ = fs::write("C:\\tmp\\pal_tracker.lua", lua_script);
    let _ = fs::remove_file("C:\\tmp\\pal_tracker.log");

    // Also copy into %APPDATA%\mpv\scripts for automatic detection
    if let Ok(appdata) = std::env::var("APPDATA") {
        let mpv_scripts = Path::new(&appdata).join("mpv").join("scripts");
        let _ = fs::create_dir_all(&mpv_scripts);
        let _ = fs::write(mpv_scripts.join("pal_tracker.lua"), lua_script);
    }

    let write_lua = format!(
        "mkdir -p /mnt/c/tmp /tmp ~/.config/mpv/scripts && printf '%s' '{}' > /tmp/pal_tracker.lua && cp /tmp/pal_tracker.lua ~/.config/mpv/scripts/pal_tracker.lua 2>/dev/null || true",
        lua_script.replace("'", "'\\''")
    );

    // Escape the title for use inside single quotes in bash
    let escaped_title = title.replace("'", "'\\''");

    // Configure start flag if resuming mid-episode
    let mut player_flags = String::from("--script=C:\\\\tmp\\\\pal_tracker.lua");
    if let Some(st) = start_time {
        if st > 15 {
            // Only resume if more than 15 seconds in
            player_flags.push_str(&format!(" --start={}", st));
        }
    }

    // Build the full script content with export for player flags
    let script_lines = format!(
        "#!/bin/bash\nrm -f /mnt/c/tmp/pal_tracker.log /tmp/pal_tracker.log\nexport ANI_CLI_PLAYER_FLAGS=\"{}\"\nani-cli '{}'{}\necho ''\nread -p '[PAL] Press Enter to close...'",
        player_flags, escaped_title, flags
    );

    // Step 1: Write tracker lua and execution script in WSL
    let write_cmd = format!(
        "{} && printf '%s' '{}' > /tmp/pal_play.sh && chmod +x /tmp/pal_play.sh",
        write_lua,
        script_lines.replace("'", "'\\''")
    );

    Command::new("wsl")
        .arg("bash")
        .arg("-c")
        .arg(&write_cmd)
        .output()
        .map_err(|e| format!("Failed to write script: {}", e))?;

    // Step 2: Execute in a visible terminal window
    let _ = Command::new("cmd")
        .arg("/C")
        .arg("start")
        .arg("PAL Companion")
        .arg("/WAIT")
        .arg("wsl")
        .arg("bash")
        .arg("/tmp/pal_play.sh")
        .status()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    // Step 3: Read the tracker log from Windows C:\tmp\pal_tracker.log or WSL /tmp/pal_tracker.log
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

                    // Extract episode number from media title (e.g. "Clannad Episode 6" or "Episode 8")
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
