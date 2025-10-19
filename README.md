
# EchoSoul

EchoSoul is a web application that allows you to create and chat with your own AI characters. Each character has a unique personality and appearance, and you can have multiple conversations with different characters.

## Features

- **Character Creation:** Create your own AI characters by providing a name and a detailed description of their personality, appearance, and background.
- **AI-Powered Conversations:** Chat with your created characters, who will respond based on the personality you've defined for them.
- **Conversation History:** All your conversations are saved, so you can continue them at any time.
- **Modern UI:** A sleek and modern user interface with a dark theme and subtle animations.
- **Two Frontends:** The project includes two frontends: a React-based frontend and a vanilla HTML/CSS/JS frontend.

## Technologies Used

### Backend

- **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
- **SQLAlchemy:** The Python SQL Toolkit and Object Relational Mapper.
- **Groq:** The AI inference engine powering the chat functionality.
- **Uvicorn:** A lightning-fast ASGI server.

### Frontend (React)

- **React:** A JavaScript library for building user interfaces.
- **Vite:** A fast build tool for modern web development.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
- **Axios:** A promise-based HTTP client for the browser and Node.js.

### Frontend (Vanilla)

- **HTML5**
- **CSS3**
- **JavaScript (ES6+)**

## Setup and Installation

To run this project locally, you'll need to have Python 3.7+ and Node.js installed on your machine.

### Backend Setup

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Create a virtual environment and activate it:**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Create a `.env` file** in the `backend` directory and add your Groq API key:

    ```
    GROQ_API_KEY=your_groq_api_key
    ```

5.  **Run the backend server:**

    ```bash
    uvicorn main:app --reload
    ```

    The backend server will be running at `http://localhost:8000`.

### Frontend Setup (React)

1.  **Navigate to the frontend directory:**

    ```bash
    cd frontend
    ```

2.  **Install the required dependencies:**

    ```bash
    npm install
    ```

3.  **Run the frontend development server:**

    ```bash
    npm run dev
    ```

    The React frontend will be running at `http://localhost:5173`.

### Frontend Setup (Vanilla)

1.  **Navigate to the `frontend-vanilla` directory:**

    ```bash
    cd frontend-vanilla
    ```

2.  **Run a simple HTTP server:**

    ```bash
    python3 -m http.server 8081
    ```

    The vanilla frontend will be running at `http://localhost:8081`.
