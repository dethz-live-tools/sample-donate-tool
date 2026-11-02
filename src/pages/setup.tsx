export function SetupPage({ error }: { error?: boolean }) {
  return (
    <div class="container">
      <div class="card elevated">
        <div class="nav-links">
          <span>RAWBLOCK // INITIAL SETUP</span>
          <a href="/">← RETURN TO DONATE</a>
        </div>
        <h1>REGISTER ADMIN</h1>
        <p class="subtitle">NO ADMIN ACCOUNT FOUND IN D1 — CREATE ONE TO UNLOCK DASHBOARD</p>

        {error && (
          <div class="status err" style="margin-bottom: 16px;">
            ERROR // PASSWORDS MUST MATCH AND BE AT LEAST 8 CHARACTERS
          </div>
        )}

        <form method="post" action="/setup">
          <label>ADMIN USERNAME</label>
          <input type="text" name="username" placeholder="admin" maxlength={50} required autofocus />

          <label>PASSWORD (MIN 8 CHARS)</label>
          <input type="password" name="password" minlength={8} maxlength={128} required />

          <label>CONFIRM PASSWORD</label>
          <input type="password" name="confirm" minlength={8} maxlength={128} required />

          <button type="submit">CREATE ADMIN & SIGN IN</button>
        </form>
      </div>
    </div>
  )
}
