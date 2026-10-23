export function LoginPage({ error }: { error?: boolean }) {
  return (
    <div class="container">
      <div class="card elevated">
        <div class="nav-links">
          <span>RAWBLOCK // AUTHENTICATION</span>
          <a href="/">← RETURN TO DONATE</a>
        </div>
        <h1>LOGIN</h1>
        <p class="subtitle">RESTRICTED DASHBOARD ACCESS</p>

        {error && (
          <div class="status err" style="margin-bottom: 16px;">
            ERROR // INVALID USERNAME OR PASSWORD
          </div>
        )}

        <form method="post" action="/login">
          <label>USERNAME</label>
          <input type="text" name="username" required autofocus />

          <label>PASSWORD</label>
          <input type="password" name="password" required />

          <button type="submit">SIGN IN</button>
        </form>
      </div>
    </div>
  )
}
