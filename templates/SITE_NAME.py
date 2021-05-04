from flask import Flask, render_template
app = Flask(__name__)

# Boilerplate code for ${SITE_NAME}! Easy Peasy huh?!

@app.route("/")
def hello():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(host='0.0.0.0')
