use skhoot_backend::cli_agent::{AgentExecutor, ExecutorConfig};
use std::env;
use std::path::PathBuf;

#[test]
fn test_resolve_path_fallback_logic() {
    // 1. Setup a mock environment
    // We can't easily mock dirs::home_dir() in a unit test without external crates or architectural changes.
    // However, we can verify the logic by "simulating" the conditions if possible,
    // or at least verify the precedence if we can manipulate CWD.

    // Let's rely on the fact that we modified the code to try CWD first, then Home.
    // We will verify that a path that exists relative to CWD is returned resolved to CWD.

    let current_dir = env::current_dir().unwrap();
    let config = ExecutorConfig {
        working_directory: current_dir.clone(),
        ..Default::default()
    };
    let executor = AgentExecutor::with_config(config);

    // Create a dummy file in CWD
    let test_file = "test_resolve_fallback.txt";
    std::fs::write(&test_file, "content").unwrap();

    // Test 1: File exists in CWD -> Should return CWD/file
    let resolved = executor.resolve_path(test_file);
    assert_eq!(resolved, current_dir.join(test_file));

    // Cleanup
    std::fs::remove_file(test_file).unwrap();

    // Test 2: Tilde expansion (should always work if Home exists)
    if let Some(home) = dirs::home_dir() {
        let resolved_tilde = executor.resolve_path("~/Desktop");
        assert_eq!(resolved_tilde, home.join("Desktop"));
    }
}
