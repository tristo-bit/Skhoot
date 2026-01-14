use serde::Serialize;
use tauri::command;

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub percent_used: f64,
}

#[command]
pub fn get_system_disks() -> Result<Vec<DiskInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        get_windows_disks()
    }
    
    #[cfg(target_os = "macos")]
    {
        get_macos_disks()
    }
    
    #[cfg(target_os = "linux")]
    {
        get_linux_disks()
    }
}

#[cfg(target_os = "windows")]
fn get_windows_disks() -> Result<Vec<DiskInfo>, String> {
    use std::process::Command;
    
    let output = Command::new("wmic")
        .args(["logicaldisk", "get", "caption,size,freespace", "/format:csv"])
        .output()
        .map_err(|e| format!("Failed to run wmic: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut disks = Vec::new();
    
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 4 {
            let name = parts[1].trim();
            let free: u64 = parts[2].trim().parse().unwrap_or(0);
            let total: u64 = parts[3].trim().parse().unwrap_or(0);
            
            if total > 0 {
                let used = total - free;
                let percent = (used as f64 / total as f64) * 100.0;
                
                disks.push(DiskInfo {
                    name: name.to_string(),
                    mount_point: name.to_string(),
                    total_bytes: total,
                    used_bytes: used,
                    free_bytes: free,
                    percent_used: percent,
                });
            }
        }
    }
    
    Ok(disks)
}

#[cfg(target_os = "macos")]
fn get_macos_disks() -> Result<Vec<DiskInfo>, String> {
    use std::process::Command;
    
    let output = Command::new("df")
        .args(["-h"])
        .output()
        .map_err(|e| format!("Failed to run df: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut disks = Vec::new();
    
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 6 && parts[0].starts_with("/dev/") {
            let mount = parts[parts.len() - 1];
            if mount == "/" || mount.starts_with("/Volumes/") {
                // Parse sizes (simplified)
                disks.push(DiskInfo {
                    name: mount.to_string(),
                    mount_point: mount.to_string(),
                    total_bytes: 0,
                    used_bytes: 0,
                    free_bytes: 0,
                    percent_used: 0.0,
                });
            }
        }
    }
    
    Ok(disks)
}

#[cfg(target_os = "linux")]
fn get_linux_disks() -> Result<Vec<DiskInfo>, String> {
    use std::process::Command;
    
    let output = Command::new("df")
        .args(["-B1"])
        .output()
        .map_err(|e| format!("Failed to run df: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut disks = Vec::new();
    
    for line in stdout.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 6 {
            let filesystem = parts[0];
            if filesystem.starts_with("/dev/") && !filesystem.contains("loop") {
                let total: u64 = parts[1].parse().unwrap_or(0);
                let used: u64 = parts[2].parse().unwrap_or(0);
                let free: u64 = parts[3].parse().unwrap_or(0);
                let mount = parts[5];
                
                if total > 0 {
                    let percent = (used as f64 / total as f64) * 100.0;
                    disks.push(DiskInfo {
                        name: mount.to_string(),
                        mount_point: mount.to_string(),
                        total_bytes: total,
                        used_bytes: used,
                        free_bytes: free,
                        percent_used: percent,
                    });
                }
            }
        }
    }
    
    Ok(disks)
}
