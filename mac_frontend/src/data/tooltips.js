export const TOOLTIPS = {
  'DHCP': 'Dynamic Host Configuration Protocol. A network management protocol used to dynamically assign an IP address and other network configuration parameters to each device on a network so they can communicate with other IP networks.',
  'DORA': 'An acronym for Discover, Offer, Request, and Acknowledge. It represents the four-step handshake process used by a client and server in DHCP to lease an IP address.',
  'DISCOVER': 'The first message in the DORA process. A client broadcasts this message on the local subnet to locate available DHCP servers.',
  'OFFER': 'The second message in the DORA process. A DHCP server responds to a Discover message by proposing an IP address and lease parameters to the client.',
  'REQUEST': 'The third message in the DORA process. The client broadcasts a message accepting the offered IP address from one specific server and implicitly declining all others.',
  'ACK': 'The final message in the DORA process. The server confirms the IP lease and provides additional network configuration parameters to the client.',
  'RELEASE': 'A message sent by the client to the server to relinquish its leased IP address before the lease time expires, returning it to the server\'s available pool.',
  'DECLINE': 'A message sent by the client to the server indicating that the offered IP address is already in use by another device on the network.',
  'OPTION82': 'Relay Agent Information Option. A standard mechanism allowing a relay agent to insert network topology information into client requests before forwarding them to the DHCP server.',
  'circuit_id': 'A sub-option of Option 82. It identifies the specific port, circuit, or VLAN on the relay agent where the client request originated.',
  'remote_id': 'A sub-option of Option 82. It uniquely identifies the relay agent hardware itself, typically using its MAC address.',
  'giaddr': 'Gateway IP Address. A field in the DHCP packet populated by a relay agent with its own IP address, allowing the server to know which subnet the client belongs to.',
  'ciaddr': 'Client IP Address. A field populated only if the client already has a valid, assigned IP address that it intends to continue using or renewing.',
  'yiaddr': '"Your" IP Address. The field used by the server to provide the newly assigned IP address to the client.',
  'chaddr': 'Client Hardware Address. The physical MAC address of the requesting client device.',
  'xid': 'Transaction ID. A 32-bit random number chosen by the client to associate responses with requests. All four DORA messages in one exchange share the same XID.',
  'BOOTP': 'Bootstrap Protocol. An older networking protocol that DHCP is built upon. DHCP messages use the exact same base packet format as BOOTP.',
  'relay agent': 'A network device, typically a router or switch, that listens for broadcast DHCP messages and forwards them as unicast packets to a server on a different subnet.',
  'lease_time': 'The total duration for which the assigned IP address is valid. The client must successfully renew its lease before this time expires to avoid losing the IP.',
  'renewal_time': 'Known as T1. The specific time interval (usually 50% of the lease time) when the client first attempts to renew its lease directly with the original DHCP server.',
  'rebinding_time': 'Known as T2. The time interval (usually 87.5% of the lease time) when the client, having failed to reach the original server, broadcasts a renewal request to any available server.',
  'subnet_mask': 'A 32-bit number that masks an IP address, dividing the IP into network address and host address components.',
  'gateway': 'The default router on a local subnet that provides a path for traffic destined for other networks or the wider internet.',
  'DNS': 'Domain Name System. A hierarchical naming system that translates human-readable domain names into the numerical IP addresses needed for routing.',
  'broadcast': 'The all-ones broadcast address (255.255.255.255 or ff:ff:ff:ff:ff:ff). Used by clients before they have an IP address to reach all hosts on the local network segment.',
  'magic_cookie': 'A standardized 4-byte sequence (99.130.83.99) placed at the start of the DHCP Options field to differentiate it from the older BOOTP vendor extensions.',
  'enp0s1': 'The primary virtual network interface assigned to the machine, used for transmitting and receiving DHCP protocol packets.',
  'Port 67': 'The standard UDP port used by DHCP servers to listen for incoming client requests and relay agent messages.',
  'Port 68': 'The standard UDP port used by DHCP clients to listen for incoming server replies and broadcast offers.',
  'op': 'Operation Code. 1 = BOOTREQUEST (client to server), 2 = BOOTREPLY (server to client). Inherited from the BOOTP protocol that DHCP extends.',
  'param_req_list': 'Parameter Request List (Option 55). A list of DHCP option codes the client wants the server to return, such as subnet mask, router, and DNS server addresses.',
  'hostname': "Option 12. The client's self-reported hostname, sent during DISCOVER and REQUEST to help the server identify the device.",
  'client_id': 'Option 61. A unique identifier for the DHCP client, typically the hardware type byte followed by the MAC address in hex.',
  'hops': 'A counter field that increments each time the packet is processed by a relay agent, preventing infinite routing loops.',
  'flags': 'A 16-bit field where the highest bit (0x8000) is the broadcast flag. It instructs the server to reply via broadcast rather than unicast if the client cannot receive IP packets yet.',
  'RFC 2131': 'The primary Internet Engineering Task Force (IETF) specification defining the core operations, state machines, and messages of the Dynamic Host Configuration Protocol.',
  'RFC 2132': 'The IETF specification detailing the standard DHCP Options and BOOTP Vendor Extensions, defining how configuration parameters are encoded.',
  'RFC 3046': 'The IETF specification defining the DHCP Relay Agent Information Option (Option 82) and its sub-options.',
  'BOUND': 'The final steady state of a successful DHCP client. It means the client has fully accepted the lease and configured its network interface with the assigned IP.',
  'INJECTED': 'A custom classification indicating that the packet was synthetically crafted and manually placed onto the network rather than generated by standard operating system networking stacks.',
  'pool': 'A specific range of contiguous IP addresses configured on the server that are available for dynamic allocation to requesting clients.',
  'scope': 'A complete grouping of IP addresses and configuration parameters (like subnet mask and gateway) managed by the server for a specific subnet.',
  'lease': 'The temporary assignment of an IP address to a specific client device for a predefined duration.'
};

export const PACKET_EXPLANATIONS = {
  'DISCOVER_SENT': {
    title: 'Client Broadcasting for Servers',
    description: 'The client initiates the DORA process by broadcasting a request across the local subnet to locate active DHCP servers.'
  },
  'OPTION82_INSERTED': {
    title: 'Relay Agent Information (RFC 3046)',
    description: 'A relay agent intercepted the broadcast and appended topology information (Option 82) before forwarding the request to a remote server.'
  },
  'OFFER_SENT': {
    title: 'Server Proposing an IP',
    description: 'A DHCP server responds to the broadcast by proposing an available IP address from its pool and detailing the lease configuration.'
  },
  'REQUEST_SENT': {
    title: 'Client Requesting Offered IP',
    description: 'The client formally requests the specific IP address offered by a server, broadcasting its decision to implicitly decline any competing offers.'
  },
  'ACK_SENT': {
    title: 'Server Confirming Lease',
    description: 'The server finalizes the transaction by confirming the lease assignment and transmitting the requested network configuration parameters.'
  },
  'IP_ASSIGNED': {
    title: 'Client Interface Configured',
    description: 'The client has transitioned to the BOUND state, applying the assigned IP address, subnet mask, and routing information to its network interface.'
  },
  'LEASE_RELEASED': {
    title: 'Client Releasing IP',
    description: 'The client terminates the lease early, notifying the server that the IP address is no longer in use and can be returned to the allocation pool.'
  }
};
