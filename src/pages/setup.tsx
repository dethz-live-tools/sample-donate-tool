export function SetupPage({ error }: { error?: boolean }) {
  return (
    <div class="container">
      <div class="nav-links">
        <span>Initial setup</span>
        <a href="/">← Return to donate</a>
      </div>
      <h1>Register admin</h1>
      <p class="subtitle">No admin account found in D1. Create one to unlock the dashboard.</p>

      {error && (
        <div class="status err" style="margin-bottom: 16px;">
          Passwords must match and be at least 8 characters
        </div>
      )}

      <form method="post" action="/setup">
        <label>Admin username</label>
        <input type="text" name="username" placeholder="admin" maxlength={50} required autofocus />

        <label>Password (min 8 chars)</label>
        <input type="password" name="password" minlength={8} maxlength={128} required />

        <label>Confirm password</label>
        <input type="password" name="confirm" minlength={8} maxlength={128} required />

        <button type="submit">Create admin & sign in</button>
      </form>
    </div>
  )
}
