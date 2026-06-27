"""
DHCP Constants and RFC 2132 Mappings
"""

# Magic Cookie for DHCP (RFC 2131 Section 3)
DHCP_MAGIC_COOKIE = b'\x63\x82\x53\x63' # 99.130.83.99

# DHCP Message Types (Option 53)
DHCP_MSG_DISCOVER = 1
DHCP_MSG_OFFER = 2
DHCP_MSG_REQUEST = 3
DHCP_MSG_DECLINE = 4
DHCP_MSG_ACK = 5
DHCP_MSG_NAK = 6
DHCP_MSG_RELEASE = 7
DHCP_MSG_INFORM = 8

# Mapping message types to names
DHCP_MSG_TYPES = {
    1: "DISCOVER",
    2: "OFFER",
    3: "REQUEST",
    4: "DECLINE",
    5: "ACK",
    6: "NAK",
    7: "RELEASE",
    8: "INFORM"
}

# RFC 2132 DHCP Option Codes
DHCP_OPTIONS = {
    1: "subnet_mask",
    2: "time_zone",
    3: "router",
    4: "time_server",
    5: "name_server",
    6: "domain_name_server",
    12: "hostname",
    15: "domain_name",
    28: "broadcast_address",
    50: "requested_addr",
    51: "lease_time",
    52: "option_overload",
    53: "message-type",
    54: "server_id",
    55: "param_req_list",
    56: "message",
    57: "max_dhcp_size",
    58: "renewal_time",
    59: "rebinding_time",
    60: "vendor_class_id",
    61: "client_id",
    82: "relay_agent_information",
    255: "end"
}

# Reverse mapping for scapy construction
DHCP_OPTIONS_REV = {v: k for k, v in DHCP_OPTIONS.items()}
