from flask import Flask, request, jsonify, abort, render_template
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

@app.route("/")
def hello():
    return render_template("index.html")

@app.route("/osc", methods=['POST'])
def receiveOSC():
    if request.method == "POST":
        key = ""
        if not request.json:
            abort(400)
            return "Failure"
        else:
            key = request.json['key'] # TO DO - send key from OSC server
            level = request.json['level']
            print( key, level )
            return "Success"
    else:
        return "Error parsing the request"