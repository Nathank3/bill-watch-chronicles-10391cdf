"Vite start attempt at $(Get-Date)" | Out-File -FilePath log_vite.txt
try {
    npx vite --port 8080 --host 0.0.0.0 2>&1 | Out-File -FilePath log_vite.txt -Append
} catch {
    $_ | Out-File -FilePath log_vite.txt -Append
}
