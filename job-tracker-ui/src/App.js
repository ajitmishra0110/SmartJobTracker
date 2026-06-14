import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login";

function App() {
    const [token, setToken] = useState(localStorage.getItem("token"));

    return (
        <div>
            {!token ? (
                <Login setToken={setToken} />
            ) : (
                <Dashboard setToken={setToken} />
            )}
        </div>
    );
}

export default App;
