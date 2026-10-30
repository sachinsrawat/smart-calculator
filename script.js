const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const historyList = document.getElementById("history-list");
const themeToggle = document.getElementById("theme-toggle");
const clearHistoryButton = document.getElementById("clear-history");
const keypad = document.querySelector(".keypad");

let expression = "";
let justCalculated = false;
let history = loadHistory();

function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem("smartCalculatorHistory"));
        return Array.isArray(saved) ? saved.slice(0, 8) : [];
    } catch {
        return [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem("smartCalculatorHistory", JSON.stringify(history));
    } catch {
        // The calculator still works if browser storage is unavailable.
    }
}

function formatNumber(number) {
    if (!Number.isFinite(number)) {
        return "Error";
    }

    const rounded = Number(number.toPrecision(12));
    return String(rounded);
}

function displayExpression(value) {
    return value
        .replace(/\*/g, " × ")
        .replace(/\//g, " ÷ ")
        .replace(/\+/g, " + ")
        .replace(/-/g, " − ")
        .trim();
}

function updateDisplay() {
    expressionDisplay.textContent = displayExpression(expression);
    resultDisplay.textContent = expression || "0";
}

function isOperator(character) {
    return ["+", "-", "*", "/"].includes(character);
}

function appendValue(value) {
    if (justCalculated && !isOperator(value)) {
        expression = "";
    }

    justCalculated = false;

    if (value === ".") {
        const currentNumber = expression.split(/[+\-*/]/).pop();

        if (currentNumber.includes(".")) {
            return;
        }

        if (currentNumber === "") {
            expression += "0";
        }
    }

    if (isOperator(value)) {
        if (expression === "") {
            if (value !== "-") {
                return;
            }
        } else if (isOperator(expression.slice(-1))) {
            if (value === "-" && expression.slice(-1) !== "-") {
                expression += value;
                updateDisplay();
                return;
            }

            expression = expression.slice(0, -1);
        }
    }

    expression += value;
    updateDisplay();
}

function clearCalculator() {
    expression = "";
    justCalculated = false;
    expressionDisplay.textContent = "";
    resultDisplay.textContent = "0";
}

function deleteLast() {
    if (justCalculated) {
        clearCalculator();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}

function toggleSign() {
    if (!expression) {
        expression = "-";
        updateDisplay();
        return;
    }

    const match = expression.match(/(\d*\.?\d+)$/);

    if (!match) {
        return;
    }

    const number = match[0];
    const start = match.index;
    const before = expression.slice(0, start);

    if (before.endsWith("-") && (before.length === 1 || isOperator(before.slice(-2, -1)))) {
        expression = before.slice(0, -1) + number;
    } else {
        expression = before + "(-" + number + ")";
    }

    // Keep sign switching simple and predictable for this calculator.
    expression = expression.replace(/\(-(\d*\.?\d+)\)$/, "-$1");

    justCalculated = false;
    updateDisplay();
}

function calculatePercentage() {
    if (!expression) {
        return;
    }

    const match = expression.match(/(\d*\.?\d+)$/);

    if (!match) {
        return;
    }

    const number = Number(match[0]);

    if (!Number.isFinite(number)) {
        showError();
        return;
    }

    expression = expression.slice(0, match.index) + formatNumber(number / 100);
    justCalculated = false;
    updateDisplay();
}

function evaluateExpression(input) {
    // Only allow numeric expressions and arithmetic operators.
    if (!/^[0-9+\-*/.()\s]+$/.test(input)) {
        throw new Error("Invalid expression");
    }

    // Evaluate only after validating the entire expression.
    const result = Function('"use strict"; return (' + input + ')')();

    if (typeof result !== "number" || !Number.isFinite(result)) {
        throw new Error("Invalid result");
    }

    return result;
}

function showError() {
    resultDisplay.textContent = "Invalid calculation";
}

function calculate() {
    if (!expression || isOperator(expression.slice(-1))) {
        return;
    }

    try {
        const originalExpression = expression;
        const result = evaluateExpression(originalExpression);
        const formattedResult = formatNumber(result);

        history.unshift({
            expression: displayExpression(originalExpression),
            result: formattedResult
        });

        history = history.slice(0, 8);
        saveHistory();
        renderHistory();

        expressionDisplay.textContent = displayExpression(originalExpression) + " =";
        resultDisplay.textContent = formattedResult;
        expression = formattedResult;
        justCalculated = true;
    } catch {
        showError();
    }
}

function renderHistory() {
    historyList.replaceChildren();

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-history";
        emptyMessage.textContent = "Your calculations will appear here.";
        historyList.appendChild(emptyMessage);
        return;
    }

    history.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "history-item";

        const details = document.createElement("div");

        const savedExpression = document.createElement("p");
        savedExpression.className = "history-expression";
        savedExpression.textContent = item.expression;

        const savedResult = document.createElement("p");
        savedResult.className = "history-result";
        savedResult.textContent = "= " + item.result;

        details.append(savedExpression, savedResult);

        const useButton = document.createElement("button");
        useButton.className = "history-use";
        useButton.textContent = "Use result";
        useButton.type = "button";
        useButton.addEventListener("click", () => {
            expression = item.result;
            justCalculated = false;
            updateDisplay();
        });

        row.append(details, useButton);
        historyList.appendChild(row);
    });
}

function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
}

keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const value = button.dataset.value;
    const action = button.dataset.action;

    if (value !== undefined) {
        appendValue(value);
        return;
    }

    switch (action) {
        case "clear":
            clearCalculator();
            break;
        case "delete":
            deleteLast();
            break;
        case "percent":
            calculatePercentage();
            break;
        case "sign":
            toggleSign();
            break;
        case "calculate":
            calculate();
            break;
    }
});

document.addEventListener("keydown", (event) => {
    if (/^[0-9.]$/.test(event.key)) {
        appendValue(event.key);
    } else if (["+", "-", "*", "/"].includes(event.key)) {
        appendValue(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculate();
    } else if (event.key === "Backspace") {
        deleteLast();
    } else if (event.key === "Escape") {
        clearCalculator();
    } else if (event.key === "%") {
        calculatePercentage();
    }
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const darkMode = document.body.classList.contains("dark");

    themeToggle.textContent = darkMode ? "☀" : "☾";
    themeToggle.setAttribute(
        "aria-label",
        darkMode ? "Switch to light theme" : "Switch to dark theme"
    );

    try {
        localStorage.setItem("smartCalculatorTheme", darkMode ? "dark" : "light");
    } catch {
        // Theme switching still works for the current session.
    }
});

clearHistoryButton.addEventListener("click", clearHistory);

// Restore the saved theme.
try {
    if (localStorage.getItem("smartCalculatorTheme") === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "☀";
        themeToggle.setAttribute("aria-label", "Switch to light theme");
    }
} catch {
    // Use the default light theme if browser storage is unavailable.
}

renderHistory();
updateDisplay();