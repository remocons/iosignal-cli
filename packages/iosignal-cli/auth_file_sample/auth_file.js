/*
  Authentication data sample.

  device props: ["did", "key", "cid", role?, quota? ]
    did: ( device id ) authentication id.  maximum 8 chars.
    key: ( device key ) authentication key. no size limit. recommended ~44 base64 chars.
    cid: ( communication id ) signal target id.  maximum 12 chars.
    role: 'device' (default) | 'service' | 'admin'. admin may use the sudo service.
    quota: server quota profile (anonymous | basic | pro | unlimited).
           default: basic for a device, unlimited for service and admin.

*/
export const authInfo = [
  ["did","passowrd","cid"],
  ["uno","uno-key","uno"],
  ["go","go-key","go","device","pro"],
  ["bro","bro-key","bro","service"],
  ["admin","admin-key","admin","admin"],
]
