use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

/// Holds the optional Node.js backend process so we can kill it on exit.
struct BackendProcess(Mutex<Option<Child>>);

/// Resolves the project root directory depending on build mode.
fn project_dir(_app: &tauri::App) -> std::path::PathBuf {
    #[cfg(debug_assertions)]
    {
        // Dev mode:
        //   CARGO_MANIFEST_DIR = /.../redragon/frontend/src-tauri
        //   parent → frontend/ → parent → project root
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap()
            .parent().unwrap()
            .to_path_buf()
    }
    #[cfg(not(debug_assertions))]
    {
        // Production: everything is bundled as a Tauri resource
        _app.path().resource_dir().unwrap()
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let root = project_dir(app);

            // ── Spawn backend ──
            eprintln!("[tauri] Starting backend from: {}", root.display());
            let child = {
                #[cfg(debug_assertions)]
                {
                    Command::new("pnpm")
                        .args(["exec", "tsx", "backend/start-server.ts"])
                        .env("PORT", "3000")
                        .current_dir(&root)
                        .spawn()
                        .map_err(|e| {
                            eprintln!("[tauri] Failed to start backend: {e}");
                            e
                        })
                        .ok()
                }
                #[cfg(not(debug_assertions))]
                {
                    let backend_dir = root.join("backend");
                    Command::new("node")
                        .arg("dist/start-server.js")
                        .env("PORT", "3000")
                        .current_dir(&backend_dir)
                        .spawn()
                        .map_err(|e| {
                            eprintln!("[tauri] Failed to start backend: {e}");
                            eprintln!("[tauri] Ensure Node.js >= 18 is installed and on PATH");
                            e
                        })
                        .ok()
                }
            };

            app.manage(BackendProcess(Mutex::new(child)));

            // ── Tray Icon ──
            let show_item =
                MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Redragon K629 Controller")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        kill_backend(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Kill the spawned Node.js backend if it is still running.
fn kill_backend(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<BackendProcess>() {
        if let Ok(mut guard) = state.0.lock() {
            if let Some(ref mut child) = *guard {
                eprintln!("[tauri] Stopping backend (pid {})", child.id());
                let _ = child.kill();
                let _ = child.wait();
            }
            *guard = None;
        }
    }
}
