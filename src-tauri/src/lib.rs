use std::process::Command;

#[tauri::command]
async fn play_anime(
    title: String,
    episode: Option<u32>,
    is_dub: bool,
    quality: String,
    skip_intro: bool,
) -> Result<String, String> {
    println!(
        "[PAL] title={} ep={:?} dub={} quality={} skip={}",
        title, episode, is_dub, quality, skip_intro
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

    // Escape the title for use inside single quotes in bash
    let escaped_title = title.replace("'", "'\\''");

    // Build the full script content
    let script_lines = format!(
        "#!/bin/bash\nani-cli '{}'{}\necho ''\nread -p '[PAL] Press Enter to close...'",
        escaped_title, flags
    );

    // Step 1: Write script via printf (safer than echo for special chars)
    let write_cmd = format!(
        "printf '%s' '{}' > /tmp/pal_play.sh && chmod +x /tmp/pal_play.sh",
        script_lines.replace("'", "'\\''")
    );

    Command::new("wsl")
        .arg("bash")
        .arg("-c")
        .arg(&write_cmd)
        .output()
        .map_err(|e| format!("Failed to write script: {}", e))?;

    // Step 2: Execute in a visible terminal window
    let status = Command::new("cmd")
        .arg("/C")
        .arg("start")
        .arg("PAL Companion")
        .arg("/WAIT")
        .arg("wsl")
        .arg("bash")
        .arg("/tmp/pal_play.sh")
        .status()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    Ok(if status.success() {
        "Playback finished".into()
    } else {
        "Playback window closed".into()
    })
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
