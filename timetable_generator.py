import random
import json
import os
import re
import fitz  # PyMuPDF for reading PDFs
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ===================================================================
# 1. FLASK API SETUP
# ===================================================================
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ===================================================================
# 2. DATA STRUCTURES (CLASSES)
# ===================================================================
class Course:
    def __init__(self, code, name, credits, course_type, subject):
        self.code = code; self.name = name; self.credits = credits; self.type = course_type; self.subject = subject
    def __repr__(self): return f"{self.code}: {self.name}"

class Faculty:
    def __init__(self, name, expertise):
        self.name = name; self.expertise = expertise
    def __repr__(self): return self.name

class Room:
    def __init__(self, room_id, capacity, room_type):
        self.id = room_id; self.capacity = capacity; self.type = room_type
    def __repr__(self): return self.id

class ScheduledClass:
    def __init__(self, course, faculty, room, time_slot):
        self.course = course; self.faculty = faculty; self.room = room; self.time_slot = time_slot
    def __repr__(self): return f"[{self.course.code} | {self.faculty.name} | {self.room.id} | {self.time_slot}]"

# ===================================================================
# 3. GENETIC ALGORITHM CORE (FULLY IMPLEMENTED)
# ===================================================================
class TimetableGenerator:
    def __init__(self, courses, faculty, rooms, time_slots, population_size=100, generations=500, mutation_rate=0.1):
        self.courses = courses; self.faculty = faculty; self.rooms = rooms; self.time_slots = time_slots
        self.population_size = population_size; self.generations = generations; self.mutation_rate = mutation_rate; self.population = []
    
    def create_initial_population(self):
        self.population = []
        for _ in range(self.population_size):
            timetable = []
            for course in self.courses:
                qualified_faculty = [f for f in self.faculty if f.expertise == course.subject]
                assigned_faculty = random.choice(qualified_faculty) if qualified_faculty else random.choice(self.faculty)
                
                scheduled_class = ScheduledClass(
                    course=course,
                    faculty=assigned_faculty,
                    room=random.choice(self.rooms),
                    time_slot=random.choice(self.time_slots)
                )
                timetable.append(scheduled_class)
            self.population.append(timetable)
        print("Initial population created.")

    def calculate_fitness(self, timetable):
        fitness_score = 1000
        clashes = {}
        for sc in timetable:
            key_faculty = (sc.faculty.name, sc.time_slot)
            if key_faculty in clashes:
                fitness_score -= 100
            else:
                clashes[key_faculty] = True

            key_room = (sc.room.id, sc.time_slot)
            if key_room in clashes:
                fitness_score -= 100
            else:
                clashes[key_room] = True
        
        for sc in timetable:
            if sc.faculty.expertise != sc.course.subject:
                fitness_score -= 50
            if sc.course.type == "Practical/Lab" and sc.room.type != "Computer Lab":
                fitness_score -= 10
            if sc.course.type == "Theory" and sc.room.type != "Lecture Hall":
                fitness_score -= 10
        
        return fitness_score

    def evolve_population(self):
        ranked_population = sorted(self.population, key=lambda tt: self.calculate_fitness(tt), reverse=True)
        new_population = []
        elite_count = int(self.population_size * 0.2)
        new_population.extend(ranked_population[:elite_count])
        
        while len(new_population) < self.population_size:
            parent1 = random.choice(ranked_population[:elite_count])
            parent2 = random.choice(ranked_population[:elite_count])
            
            if len(self.courses) > 1:
                crossover_point = random.randint(1, len(self.courses) - 1)
                child = parent1[:crossover_point] + parent2[crossover_point:]
            else:
                child = parent1 # Cannot perform crossover with one course

            if random.random() < self.mutation_rate and len(child) > 0:
                gene_to_mutate = random.randint(0, len(child) - 1)
                child[gene_to_mutate].time_slot = random.choice(self.time_slots)
                child[gene_to_mutate].room = random.choice(self.rooms)
                qualified_faculty = [f for f in self.faculty if f.expertise == child[gene_to_mutate].course.subject]
                if qualified_faculty:
                    child[gene_to_mutate].faculty = random.choice(qualified_faculty)

            new_population.append(child)
            
        self.population = new_population

    def run(self):
        self.create_initial_population()
        for i in range(self.generations):
            self.evolve_population()
            if (i + 1) % 250 == 0:
                best_fitness = self.calculate_fitness(self.population[0])
                print(f"Generation {i + 1}: Best Fitness = {best_fitness}")
        
        best_timetable = sorted(self.population, key=lambda tt: self.calculate_fitness(tt), reverse=True)[0]
        return best_timetable, self.calculate_fitness(best_timetable)

# ===================================================================
# 4. API ENDPOINTS
# ===================================================================

@app.route('/generate', methods=['POST'])
def generate_timetable_endpoint():
    print("Received request to generate timetable...")
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid input"}), 400

    try:
        courses = [Course(c['code'], c.get('name', ''), int(c.get('credits', 0)), c.get('type', ''), c.get('subject', c.get('expertise', 'General'))) for c in data.get('courses', [])]
        faculty = [Faculty(f['name'], f.get('expertise', '')) for f in data.get('faculty', [])]
        rooms = [Room(r['id'], int(r.get('capacity', 0)), r.get('type', '')) for r in data.get('rooms', [])]
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": f"Missing or invalid data field: {e}"}), 400

    time_slots = [
        ("Monday", "9:00 - 10:00"), ("Monday", "10:00 - 11:00"), ("Monday", "11:00 - 12:00"),
        ("Tuesday", "9:00 - 10:00"), ("Tuesday", "10:00 - 11:00"),
        ("Wednesday", "9:00 - 10:00"), ("Wednesday", "10:00 - 11:00"), ("Wednesday", "11:00 - 12:00"),
        ("Thursday", "9:00 - 10:00"), ("Friday", "9:00 - 10:00"),
    ]
    
    if not all([courses, faculty, rooms]):
        return jsonify({"error": "Courses, faculty, and rooms data cannot be empty"}), 400

    generator = TimetableGenerator(courses, faculty, rooms, time_slots)
    best_solution, best_score = generator.run()
    
    print(f"Best solution found with fitness score: {best_score}")

    timetable_json_data = [{
        "time": sc.time_slot[1], "day": sc.time_slot[0], "subject": sc.course.code,
        "teacher": sc.faculty.name, "room": sc.room.id
    } for sc in best_solution]
    
    return jsonify({ "timetable": timetable_json_data, "fitness_score": best_score })


@app.route('/analyze', methods=['POST'])
def analyze_document_endpoint():
    print("Received request to analyze document...")
    if 'file' not in request.files: return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']
    analysis_type = request.form.get('analysis_type')

    if file.filename == '': return jsonify({"error": "No selected file"}), 400

    if file and analysis_type:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            doc = fitz.open(filepath)
            text_content = "".join(page.get_text() for page in doc)
            print(f"Successfully extracted {len(text_content)} characters from the document.")
        except Exception as e:
            return jsonify({"error": f"Could not read file: {e}"}), 500

        results = {}
        if analysis_type == 'course_list':
            courses = re.findall(r'([A-Z]{2,4}-\d{3})\s(.*?)\n', text_content)
            faculty = re.findall(r'(Dr\.|Prof\.)\s([A-Z][a-z]+ [A-Z][a-z]+)', text_content)
            results = {
                "type": "course_list", "data": {
                    "courses": [{"code": c[0], "name": c[1], "credits": "3", "type": "Theory"} for c in courses],
                    "faculty": [{"name": f"{f[0]} {f[1]}", "expertise": "Unknown"} for f in faculty]
                }}
        elif analysis_type == 'student_marks':
            marks = re.findall(r'([A-Z.]{5,}\d{5,})\s*[:\-]\s*(\d{1,3})', text_content)
            results = {
                "type": "student_marks", "data": {
                    "test_name": "Extracted Marks",
                    "marks": [{"rollNumber": m[0], "subject": "Unknown", "mark": int(m[1])} for m in marks]
                }}
        else:
            return jsonify({"error": "Invalid analysis type"}), 400
        
        print("Analysis complete. Sending results.")
        return jsonify(results)

    return jsonify({"error": "Missing file or analysis type"}), 400

@app.route('/update-marks', methods=['POST'])
def update_marks_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid input"}), 400
    
    print("\n" + "="*30)
    print("  RECEIVED MARKS FROM FRONTEND")
    print("="*30)
    print(f"  Student Roll No: {data.get('student_roll')}")
    print(f"  Course: {data.get('course_code')}")
    print(f"  Test: {data.get('test_name')}")
    print(f"  Marks: {data.get('marks')}")
    print("="*30 + "\n")

    return jsonify({"status": "success", "message": "Marks received successfully"}), 200


# ===================================================================
# 5. START THE SERVER
# ===================================================================
if __name__ == "__main__":
    print("Starting Flask server for AI Timetable Generator...")
    # To run this, you will need to install Flask, Flask-CORS and PyMuPDF:
    # pip install Flask Flask-CORS PyMuPDF
    app.run(debug=True, port=5000)

