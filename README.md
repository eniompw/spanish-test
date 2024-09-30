# AI-Powered Spanish Exam Tutor

This application is an interactive exam tutor that leverages AI to provide personalized feedback on student answers for Spanish language exams.

## Key Features

* **Spanish Language Focus**: Designed specifically for Spanish language exams.
* **AI-Powered Feedback**: Utilizes Google's Gemini 1.5 Pro model for comprehensive feedback:
  - Flash Response: Provides a concise summary of the answer.
  - Pro Response: Offers detailed feedback and marking.
* **Interactive UI**: 
  - Easy navigation between questions
  - Real-time AI feedback
  - Progress tracking

## How It Works

1. **Question Presentation**: Questions are fetched from a Spanish-specific SQLite database.
2. **Answer Submission**: Students enter their answers in a text area.
3. **AI Feedback**: 
   - Flash AI response provides a quick summary.
   - Pro AI response offers detailed feedback and marking.
4. **Navigation**: Users can move between questions and try again as needed.

## Technical Stack

* **Backend**: Flask (Python)
* **Frontend**: HTML, CSS, JavaScript
* **AI Model**: Google's Gemini 1.5 Pro
* **Database**: SQLite

## Setup and Running

1. Clone the repository
2. Install required Python packages: `pip install -r requirements.txt`
3. Set up your Google API key as an environment variable:
   ```bash
   echo 'export GOOGLE_API_KEY=AI...' >> ~/.bashrc
   source ~/.bashrc
   ```
   Replace `AI...` with your actual Google API key.
4. (Optional) Install phpLiteAdmin for database management:
   ```bash
   curl -s https://raw.githubusercontent.com/eniompw/phpLiteAdmin/main/install.sh | bash
   ```
   This will install phpLiteAdmin, which can be useful for managing your SQLite database.
   To run phpLiteAdmin for a specific database file, use:
   ```bash
   pla filename.db
   ```
   Replace `filename.db` with the name of your SQLite database file (e.g., `spanish.db`).
5. Run the Flask application: `python app.py`
6. Access the application in your web browser at `http://localhost:5000`

## License

This project is licensed under the MIT License.