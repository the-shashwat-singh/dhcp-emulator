export function decodePacket(packet) {
  if (!packet) return [];
  
  // Convert packet object into array of sections for the Accordion
  const sections = [];
  
  sections.push({
    title: "Ethernet Frame",
    fields: [
      { name: "Source MAC", value: packet.src_mac },
      { name: "Destination MAC", value: packet.dst_mac }
    ]
  });
  
  sections.push({
    title: "IP Header",
    fields: [
      { name: "Source IP", value: packet.src_ip },
      { name: "Destination IP", value: packet.dst_ip }
    ]
  });
  
  sections.push({
    title: "UDP Header",
    fields: [
      { name: "Source Port", value: packet.src_port },
      { name: "Destination Port", value: packet.dst_port }
    ]
  });
  
  sections.push({
    title: "BOOTP Fields",
    fields: [
      { name: "Transaction ID (XID)", value: packet.xid },
      { name: "Client IP (ciaddr)", value: packet.ciaddr },
      { name: "Your IP (yiaddr)", value: packet.yiaddr },
      { name: "Gateway IP (giaddr)", value: packet.giaddr },
      { name: "Client Hardware Address", value: packet.chaddr },
      { name: "Hops", value: packet.hops },
      { name: "Flags", value: packet.flags }
    ]
  });
  
  if (packet.options && packet.options.length > 0) {
    sections.push({
      title: "DHCP Options",
      isTable: true,
      fields: packet.options
    });
  }
  
  return sections;
}
