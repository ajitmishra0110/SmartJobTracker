import React, { useState } from "react";
import API from "./api";
import "./App.css";

function Login({ setToken }) {
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
            const res = await API.post(endpoint, { email, password });

            if (mode === "login") {
                localStorage.setItem("token", res.data);
                setToken(res.data);
            } else {
                setMode("login");
                setError("Account created. Log in to open your pipeline.");
            }
        } catch (err) {
            const serverMessage =
                err.response?.data?.message ||
                err.response?.data ||
                (err.response?.status === 409 ? "Email already registered." : null);

            if (serverMessage && typeof serverMessage === "string") {
                setError(serverMessage);
            } else if (!err.response) {
                setError(
                    "Cannot reach the API. Check REACT_APP_API_URL on Vercel and CORS_ALLOWED_ORIGINS on Render gateway."
                );
            } else {
                setError(
                    mode === "login"
                        ? "Login failed. Check your email and password."
                        : "Signup failed. Use a valid email and an 8+ character password."
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-shell">
            <section className="auth-card">
                <p className="eyebrow">SmartJobTracker AI</p>
                <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="auth-copy">
                    Track applications, drag jobs across your pipeline, and use AI to parse postings,
                    prep for interviews, and coach your search.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@email.com"
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Enter password"
                            minLength={8}
                            required
                        />
                    </label>

                    {error && <p className="message error">{error}</p>}

                    <button className="primary-button" disabled={isSubmitting} type="submit">
                        {isSubmitting
                            ? "Please wait..."
                            : mode === "login"
                              ? "Log in"
                              : "Sign up"}
                    </button>
                </form>

                <button
                    className="text-button"
                    onClick={() => {
                        setMode(mode === "login" ? "signup" : "login");
                        setError("");
                    }}
                    type="button"
                >
                    {mode === "login"
                        ? "Need an account? Sign up"
                        : "Already have an account? Log in"}
                </button>
            </section>
        </main>
    );
}

export default Login;
