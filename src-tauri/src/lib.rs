use std::process::Command;

#[tauri::command]
async fn play_anime(title: String, episode: u32) -> Result<String, String> {
    println!("Playing {} episode {}", title, episode);

    // Call wsl ani-cli "title" -e episode
    let output = Command::new("wsl")
        .arg("ani-cli")
        .arg(&title)
        .arg("-e")
        .arg(episode.to_string())
        .output()
        .map_err(|e| format!("Failed to execute process: {}", e))?;

    if output.status.success() {
        Ok(String::from("Playback finished successfully"))
    } else {
        // If English fails, we could try Romaji here, but for now we'll just return the error
        // Or we can return an error and let the frontend retry with Romaji!
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
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
