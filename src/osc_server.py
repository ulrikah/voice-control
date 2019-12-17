"""Small example OSC server from https://github.com/attwad/python-osc/tree/master/pythonosc

This program listens to several addresses, and prints some information about
received packets.
"""
import argparse
import math

import mido
import time

from pythonosc import dispatcher
from pythonosc import osc_server

prev_key = ""

MIDI_PORTS = ['UM-ONE', 'IAC-driver virtual'] # TO DO: receive from args, pick the first one enabled from mido
for port in MIDI_PORTS:
	try: 
		out = mido.open_output(port)
		print(f"Connected to MIDI port {port}")
		break
	except IOError:
		print(f"The MIDI port {port} is not configurable")

if not out:
	raise IOError("No MIDI interface detected")


def receive_osc(address, args, key, level, msg_type):
    print("[{0}] ~ {1} ~ {2} ~ {3}".format(args[0], key, round(level, 2), msg_type))
    vel = round(map_range(level, 0.1, 0.40, 20, 127))
    if key and vel and msg_type:
        send_msg(key, vel, msg_type)

def send_msg(key, vel, msg_type):
	'''
	on = mido.Message("note_on", note=key, velocity=vel)
	off = mido.Message("note_off", note=key, velocity=vel)
	print("[START]", key)
	out.send(on)
	time.sleep(1)
	out.send(off)
	print("[STOP]", key)
	'''
	msg = mido.Message(msg_type, note=key, velocity=vel)
	out.send(msg)
	return

def map_range(x,a,b,c,d, clamp=True):
    y=(x-a)/(b-a)*(d-c)+c
    if clamp:
        if y < c: return c
        elif y > d: return d
    return y

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument("--ip",
      default="127.0.0.1", help="The ip to listen on")
  parser.add_argument("--port",
      type=int, default=5005, help="The port to listen on")
  args = parser.parse_args()

  dispatcher = dispatcher.Dispatcher()
  dispatcher.map("/osc", receive_osc, "MIDI")
  prev_key = None
  server = osc_server.ThreadingOSCUDPServer(
      (args.ip, args.port), dispatcher)
  print("Serving on {}".format(server.server_address))
  server.serve_forever()