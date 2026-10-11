async function loginUser() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const loginError = document.getElementById("loginError");
    const loginButton = document.querySelector(".login-form button");

    loginError.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "LOGGING IN...";

    try {
        const response = await fetch(
            "/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (response.ok && data.success === true) {
            sessionStorage.setItem("sanjayTravelsLoggedIn", "true");
            window.location.href = "index.html";
            return;
        }

        loginError.textContent =
            data.error || "❌ Incorrect username or password.";
        loginError.style.color = "#ef4444";

    } catch (error) {
        console.error("Login error:", error);

        loginError.textContent =
            "❌ Unable to connect to server. Please try again.";
        loginError.style.color = "#ef4444";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";
    }
}