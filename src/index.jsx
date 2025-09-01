// index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 1. import 추가
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		{/* 2. <BrowserRouter>로 감싸기 */}
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>
);