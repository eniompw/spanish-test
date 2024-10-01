# Import necessary libraries
from flask import Flask, render_template, session, request, redirect, url_for, jsonify, abort
import sqlite3
import os
from google.generativeai import configure, GenerativeModel
from datetime import datetime, timedelta, timezone
import jinja2
from google.api_core.exceptions import ResourceExhausted
import traceback

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(16)  # Set a random secret key for session management

# Set session lifetime to 30 minutes
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

# Configure AI models
configure(api_key=os.getenv('GOOGLE_API_KEY'))  # Configure Google AI with API key
gemini_model = GenerativeModel('gemini-1.5-pro-002')  # Initialize Gemini model

def render_error(error_message):
    try:
        return render_template('error.html', error=error_message)
    except jinja2.exceptions.TemplateNotFound:
        return f"<h1>Error</h1><p>{error_message}</p><a href='/'>Return to Home</a>"

def clear_expired_sessions():
    current_time = datetime.now(timezone.utc)
    last_activity = session.get('last_activity')
    if last_activity:
        if isinstance(last_activity, str):
            last_activity = datetime.fromisoformat(last_activity).replace(tzinfo=timezone.utc)
        if (current_time - last_activity).total_seconds() > 1800:  # 30 minutes in seconds
            session.clear()
            return True
    session['last_activity'] = current_time.isoformat()
    return False

@app.before_request
def before_request():
    if clear_expired_sessions():
        session['subject'] = 'spanish'  # Reset to default subject
    session.permanent = True
    app.permanent_session_lifetime = timedelta(minutes=30)

# Function to get AI response based on the selected model
def get_ai_response(model, query):
    try:
        if model == 'flash':
            # Use Gemini model for flash response
            response = gemini_model.generate_content(query)
            return response.text.replace("\n", "<br>")  # Replace newlines with HTML line breaks
        elif model == 'pro':
            # Use Gemini model for pro response
            response = gemini_model.generate_content(query)
            return response.text.replace("\n", "<br>")  # Replace newlines with HTML line breaks
    except ResourceExhausted as e:
        error_message = f"ResourceExhausted: The AI service is currently busy. Please wait 30 seconds and try again. Details: {str(e)}"
        app.logger.error(f"AI Response Error: {error_message}")
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return {"error": error_message}
    except Exception as e:
        error_message = f"Unexpected error in get_ai_response: {str(e)}"
        app.logger.error(f"AI Response Error: {error_message}")
        app.logger.error(f"Traceback: {traceback.format_exc()}")
        return {"error": error_message}

# Modify the get_question_data function
def get_question_data():
    db_path = os.path.join('data', "spanish.db")
    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("""
                SELECT q.*, i.Text as insert_text
                FROM Questions q
                LEFT JOIN "Insert" i ON q.IID = i.IID
                ORDER BY q.QID
            """)
            rows = cur.fetchall()
            if not rows:
                raise ValueError("No questions found in the database.")
            return rows
    except sqlite3.Error as e:
        app.logger.error(f"Database error: {e}")
        abort(500, description="Unable to connect to the database.")
    except ValueError as e:
        app.logger.error(str(e))
        abort(404, description=str(e))

# Route for the home page
@app.route('/')
def home():
    if 'number' not in session:
        session['number'] = 0
    
    try:
        rows = get_question_data()
        
        session['total'] = len(rows)
        session['number'] = min(session.get('number', 0), max(0, len(rows) - 1))
        
        current_question = rows[session['number']]
        insert_text = current_question['insert_text']
        question_text = current_question['question']
        marks = current_question['marks']
        
        full_question = f"{insert_text}\n\n{question_text}" if insert_text else question_text
        full_question_with_marks = f"{full_question}<br><strong>[{marks} marks]</strong>"
        session['question'] = full_question_with_marks.replace('\n', '<br>')
        session['ms'] = current_question['answer']
        session['insert_text'] = insert_text
        session['marks'] = marks

        return render_template('index.html', question=session['question'])
    except Exception as e:
        return render_error(str(e))

# Route to get AI response
@app.route('/ai_response/<model>')
def ai_response(model):
    # Define query templates for different models
    query_templates = {
        'flash': """
        Question: {question}
        Mark scheme: {ms}
        Write a short and concise summary (Don't narrate your response).
        """,
        'pro': """
        Insert text: {insert_text}
        Question: {question}
        Marks available: {marks}
        Student's answer: {answer}
        Mark scheme: {ms}
        I am the student now mark my answer and give clear and detailed feedback on it.
        """
    }
    
    # Format the query based on the selected model
    query = query_templates[model].format(
        insert_text=session.get('insert_text', ''),
        question=session['question'],
        marks=session.get('marks', ''),
        answer=request.args.get('answer'),
        ms=session['ms']
    )
    
    # Get and return the AI response
    response = get_ai_response(model, query)
    if isinstance(response, dict) and 'error' in response:
        return jsonify(response), 503  # Service Unavailable
    return jsonify({'response': response})

# Route to get current question number
@app.route('/number')
def get_number():
    return str(session['number'])

# Route to navigate between questions
@app.route('/<direction>')
def navigate(direction):
    if direction == 'previous':
        session['number'] = max(0, session['number'] - 1)
    elif direction == 'next':
        session['number'] = min(session['total'] - 1, session['number'] + 1)
    return redirect('/')

# Route to get next question
@app.route('/next')
def next_question():
    rows = get_question_data()
    session['number'] = min(session.get('number', 0) + 1, len(rows) - 1)
    
    if session['number'] < len(rows):
        current_question = rows[session['number']]
        insert_text = current_question['insert_text']
        question_text = current_question['question']
        marks = current_question['marks']
        
        full_question = f"{insert_text}\n\n{question_text}" if insert_text else question_text
        full_question_with_marks = f"{full_question}<br><strong>[{marks} marks]</strong>"
        session['question'] = full_question_with_marks.replace('\n', '<br>')
        session['ms'] = current_question['answer']
        session['insert_text'] = insert_text
        session['marks'] = marks
        
        return jsonify({
            'success': True,
            'question': session['question'],
            'number': session['number'],
            'total': len(rows)
        })
    else:
        return jsonify({
            'success': False,
            'message': 'No more questions available'
        })

# Route to get previous question
@app.route('/previous')
def previous_question():
    rows = get_question_data()
    session['number'] = max(0, session.get('number', 0) - 1)
    
    if session['number'] >= 0:
        current_question = rows[session['number']]
        insert_text = current_question['insert_text']
        question_text = current_question['question']
        marks = current_question['marks']
        
        full_question = f"{insert_text}\n\n{question_text}" if insert_text else question_text
        full_question_with_marks = f"{full_question}<br><strong>[{marks} marks]</strong>"
        session['question'] = full_question_with_marks.replace('\n', '<br>')
        session['ms'] = current_question['answer']
        session['insert_text'] = insert_text
        session['marks'] = marks
        
        return jsonify({
            'success': True,
            'question': session['question'],
            'number': session['number'],
            'total': len(rows)
        })
    else:
        return jsonify({
            'success': False,
            'message': 'This is the first question'
        })

# Add error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_error(error.description), 404

@app.errorhandler(500)
def internal_error(error):
    return render_error(error.description), 500

# Add this new route
@app.route('/get_navigation_info')
def get_navigation_info():
    return jsonify({
        'number': session.get('number', 0),
        'total': session.get('total', 0)
    })

# Run the Flask app in debug mode if this script is executed directly
if __name__ == '__main__':
    app.run(debug=True)
