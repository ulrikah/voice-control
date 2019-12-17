from pythonosc import udp_client

class Client:
    def __init__(self, ip="127.0.0.1", port=5005):
        self.ip = ip
        self.port = int(port)
        self.client = udp_client.SimpleUDPClient(self.ip, self.port)

    def send_msg(self, key, level, msg_type, channel="/osc"):
        msg = (key, level, msg_type)
        self.client.send_message(channel, msg)