from flask import Flask, request, jsonify, abort, render_template
from flask_socketio import SocketIO, send, emit

from dotenv import load_dotenv
import os
from osc_client import Client

load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv("SECRET") or "secret"
socketio = SocketIO(app, cors_allowed_origins = "*")

client = Client(os.getenv("OSC_IP"), os.getenv("OSC_PORT"))
print("Setting up OSC client at", client.ip, "and port", client.port)

clients = []

@app.route("/")
def hello():
	return render_template("index.html")

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

# event used to parse the MIDI data from the socket connection
@socketio.on('midi')
def handle_midi(json):
	print("\n Received MIDI message")
	key = json['key']
	level = json['level']
	msg_type = json['msg_type']
	print(f"[ key {key} | level {round(level, 3)} | msg_type {msg_type}]")
	print("\n")
	client.send_msg(key, level, msg_type, request.sid)
	return "Success"

# incoming unnamed message events
@socketio.on('message')
def handle_message(message):
	print('received message: ' + message)

# connection event
@socketio.on('connect')
def handle_connect():
	print("Client connected with ID: " + request.sid)
	clients.append(request.sid)
	pass

# disconnection event
@socketio.on('disconnect')
def handle_disconnect():
	print("Client disconnected with ID: " + request.sid)
	clients.remove(request.sid)
	pass

if __name__ == '__main__':
	socketio.run(
		app,
		host = "127.0.0.1",
		debug = False,
		use_reloader = True,
		certfile=os.getenv("CERT"),
		keyfile=os.getenv("KEY")
	)