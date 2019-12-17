from flask import Flask, request, jsonify, abort, render_template
from dotenv import load_dotenv
import os
from osc_client import Client

load_dotenv()
app = Flask(__name__)
client = Client(os.getenv("OSC_IP"), os.getenv("OSC_PORT"))
print("Setting up client at", client.ip, "and port", client.port)

@app.route("/test")
def hello():
    return render_template("index.html")

@app.route("/")
def detect():
    return render_template("detect.html")

@app.route("/osc", methods=['POST'])
def receiveOSC():
    if request.method == "POST":
        key = ""
        if not (request.json and request.json['key'] and request):
            abort(400)
            return "Failure"
        else:
            key = request.json['key'] # TO DO - send key from OSC server
            level = request.json['level']
            msg_type = request.json['msg_type']
            print(f"[ key {key} | level {round(level, 3)} | msg_type {msg_type}]")
            client.send_msg(key, level, msg_type)
            return "Success"
    else:
        return "Error parsing the request"


'''
@app.route("/print", methods=['POST'])
def print():
    if request.method == "POST":
        key = ""
        if not (request.json and request.json['key'] and request):
            abort(400)
            return "Failure"
        else:
            print( "[key", key, "|", "level", round(level, 3), "]")
            return "Success"
    else:
        return "Error parsing the request"
'''