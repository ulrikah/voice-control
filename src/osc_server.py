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

MIDI_PORT = 'UM-ONE' # TO DO: receive from args
out = mido.open_output(MIDI_PORT)

def receive_osc(unused_addr, args, msg):
    print("[{0}] ~ {1}".format(args[0], msg))
    if msg:
        send_msg(msg)

def send_msg(msg):
    start = mido.Message('note_on', note=msg)
    end = mido.Message('note_off', note=msg)
    print('Should play a sound')
    out.send(start)
    time.sleep(5)
    print('Should stop the sound')
    out.send(end)
    return

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument("--ip",
      default="127.0.0.1", help="The ip to listen on")
  parser.add_argument("--port",
      type=int, default=5005, help="The port to listen on")
  args = parser.parse_args()

  dispatcher = dispatcher.Dispatcher()
  # dispatcher.map("/osc", print)
  dispatcher.map("/osc", receive_osc, "MIDI")

  server = osc_server.ThreadingOSCUDPServer(
      (args.ip, args.port), dispatcher)
  print("Serving on {}".format(server.server_address))
  server.serve_forever()