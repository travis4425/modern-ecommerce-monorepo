# ─────────────────────────────────────────────────────────────────────────────
#  Demo luồng xác thực — chạy: pnpm auth:demo
#
#  Dùng Invoke-RestMethod thay vì curl.exe: PowerShell không truyền dấu nháy
#  cho chương trình ngoài giống bash, nên JSON trong curl gần như luôn hỏng.
#  Invoke-RestMethod nhận object PowerShell rồi tự chuyển sang JSON, và tự quản
#  lý cookie qua WebSession — không cần file cookie.txt.
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:8080/api/v1'

function Write-Step { param([string]$Text) Write-Host "`n── $Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "   OK  $Text" -ForegroundColor Green }
function Write-Bad  { param([string]$Text) Write-Host "   !!  $Text" -ForegroundColor Red }

# Gọi API và luôn trả về body, kể cả khi HTTP trả mã lỗi.
function Invoke-Api {
    param(
        [string]$Method, [string]$Path, $Body,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$Token
    )
    $params = @{ Method = $Method; Uri = "$BaseUrl$Path"; ContentType = 'application/json' }
    if ($Body)    { $params.Body = ($Body | ConvertTo-Json -Compress) }
    if ($Session) { $params.WebSession = $Session }
    if ($Token)   { $params.Headers = @{ Authorization = "Bearer $Token" } }

    try {
        return Invoke-RestMethod @params
    } catch {
        # PowerShell coi 4xx/5xx là lỗi. Body thật nằm trong ErrorDetails.
        if ($_.ErrorDetails.Message) { return ($_.ErrorDetails.Message | ConvertFrom-Json) }
        throw
    }
}

Write-Host "`n=== Demo xác thực — $BaseUrl ===" -ForegroundColor White

# ── 1. Đăng nhập ────────────────────────────────────────────────────────────
Write-Step '1. Đăng nhập admin@example.com'
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' `
    -Body (@{ email = 'admin@example.com'; password = 'Password@123' } | ConvertTo-Json -Compress) `
    -SessionVariable session

if (-not $login.success) { Write-Bad 'Đăng nhập thất bại'; $login | ConvertTo-Json -Depth 5; exit 1 }
Write-Ok "vai trò $($login.data.user.role), $($login.data.user.permissions.Count) quyền, access token sống $($login.data.expiresIn)s"

$cookieUri = "$BaseUrl/auth"
$oldRefresh = $session.Cookies.GetCookies($cookieUri)['refreshToken'].Value
Write-Ok "refresh token nằm trong cookie HTTPOnly, dài $($oldRefresh.Length) ký tự"

# ── 2. Gọi endpoint cần đăng nhập ───────────────────────────────────────────
Write-Step '2. GET /auth/me bằng access token'
$me = Invoke-Api -Method Get -Path '/auth/me' -Token $login.data.accessToken
Write-Ok "$($me.data.email) — $($me.data.permissions.Count) quyền"

Write-Step '3. GET /auth/me KHÔNG kèm token'
$noToken = Invoke-Api -Method Get -Path '/auth/me'
if ($noToken.error.code -eq 'AUTH_TOKEN_MISSING') { Write-Ok 'bị chặn đúng: AUTH_TOKEN_MISSING' }
else { Write-Bad "mong đợi AUTH_TOKEN_MISSING, nhận $($noToken.error.code)" }

Write-Step '4. GET /auth/me với token bị sửa'
$tampered = $login.data.accessToken.Substring(0, $login.data.accessToken.Length - 3) + 'xyz'
$bad = Invoke-Api -Method Get -Path '/auth/me' -Token $tampered
if ($bad.error.code -eq 'AUTH_TOKEN_INVALID') { Write-Ok 'bị chặn đúng: AUTH_TOKEN_INVALID' }
else { Write-Bad "mong đợi AUTH_TOKEN_INVALID, nhận $($bad.error.code)" }

# ── 5. Xoay refresh token ───────────────────────────────────────────────────
Write-Step '5. POST /auth/refresh — refresh token phải được XOAY'
$refreshed = Invoke-Api -Method Post -Path '/auth/refresh' -Session $session
if (-not $refreshed.success) { Write-Bad "refresh thất bại: $($refreshed.error.code)"; exit 1 }
$newRefresh = $session.Cookies.GetCookies($cookieUri)['refreshToken'].Value
if ($newRefresh -ne $oldRefresh) { Write-Ok 'cookie đã đổi sang token mới' }
else { Write-Bad 'cookie KHÔNG đổi — rotation không hoạt động' }

# ── 6. Phát hiện đánh cắp ───────────────────────────────────────────────────
Write-Step '6. Dùng lại refresh token CŨ — mô phỏng token bị đánh cắp'
$replay = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$replay.Cookies.Add((New-Object System.Net.Cookie('refreshToken', $oldRefresh, '/api/v1/auth', 'localhost')))
$reused = Invoke-Api -Method Post -Path '/auth/refresh' -Session $replay

if ($reused.error.code -eq 'AUTH_REFRESH_TOKEN_REUSED') {
    Write-Ok 'AUTH_REFRESH_TOKEN_REUSED — toàn bộ family đã bị thu hồi'
    Write-Host '       (xem dòng log đỏ trong terminal đang chạy pnpm dev)' -ForegroundColor DarkGray
} else {
    Write-Bad "mong đợi AUTH_REFRESH_TOKEN_REUSED, nhận $($reused.error.code)"
}

Write-Step '7. Token MỚI giờ cũng phải chết theo (cả family bị thu hồi)'
$afterRevoke = Invoke-Api -Method Post -Path '/auth/refresh' -Session $session
if ($afterRevoke.success) { Write-Bad 'token mới vẫn dùng được — family chưa bị thu hồi' }
else { Write-Ok "bị chặn đúng: $($afterRevoke.error.code)" }

# ── 8. Phân quyền ───────────────────────────────────────────────────────────
Write-Step '8. Khách hàng thường có bao nhiêu quyền?'
$customer = Invoke-Api -Method Post -Path '/auth/login' -Body @{ email = 'khach1@example.com'; password = 'Password@123' }
if ($customer.success) {
    Write-Ok "vai trò $($customer.data.user.role), $($customer.data.user.permissions.Count) quyền quản trị"
} else { Write-Bad $customer.error.code }

Write-Step '9. Sai mật khẩu — phải trả cùng mã lỗi như email không tồn tại'
$wrongPass  = Invoke-Api -Method Post -Path '/auth/login' -Body @{ email = 'admin@example.com'; password = 'SaiMatKhau@1' }
$noSuchUser = Invoke-Api -Method Post -Path '/auth/login' -Body @{ email = 'khong-ton-tai@example.com'; password = 'SaiMatKhau@1' }
if ($wrongPass.error.code -eq $noSuchUser.error.code) {
    Write-Ok "cả hai đều là $($wrongPass.error.code) — không lộ email nào đã đăng ký"
} else {
    Write-Bad "hai mã khác nhau: $($wrongPass.error.code) vs $($noSuchUser.error.code)"
}

Write-Host "`n=== Xong ===`n" -ForegroundColor White
