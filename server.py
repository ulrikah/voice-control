from flask import Flask, request, jsonify, abort
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)

@app.route("/")
def hello():
        return "<h1>Hello, World!</h1>"

@app.route("/osc", methods=['POST'])
def receiveOSC():
    if request.method == "POST":
        key = ""
        if not request.json:
            abort(400)
        else:
            print(request.json['key'])
            key = request.json['key'] # send key from OSC server
            return key
    else:
        return "Error parsing the request"