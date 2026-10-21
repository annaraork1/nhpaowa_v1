# Contract: NOC API

Resource `noc`: SUPERADMIN/SECRETARY view+createEdit; TREASURER view+createEdit (approve); COMMITTEE view.

- `GET /noc?status=&purpose=&flatId=`
- `POST /noc` create
- `PATCH /noc/:id` update draft fields
- `POST /noc/:id/submit|issue|reject|cancel`
- `GET /noc/:id` detail for print
