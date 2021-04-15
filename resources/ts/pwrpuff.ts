interface ChargeLocation {
    distance: number;
    name: string;
    address: string;
    charge: number;
    chargeTime: number;
}

const locs: ChargeLocation[] = [
    {
        distance: 3.1,
        name: 'Elon Musk',
        address: '3500 Deer Creek, Palo Alto, CA',
        charge: 89,
        chargeTime: 12,
    },
    {
        distance: 0.1,
        name: 'Bill Gates',
        address: '1835 73rd Ave NE, Medina, WA 98039',
        charge: 17,
        chargeTime: 50,
    },
    {
        distance: 2.2,
        name: 'Tim Cook',
        address: 'One Apple Park Way, Cupertino, CA 95014',
        charge: 98,
        chargeTime: 90,
    },
]

function createRow(loc: ChargeLocation): HTMLDivElement {
    const row = document.createElement('div');
    row.classList.add('location');
    const name = document.createElement('p');
    name.classList.add('loc-name');
    name.textContent = loc.name;
    const dist = document.createElement('p');
    dist.classList.add('loc-dist');
    if (loc.distance < 0.05) {
        dist.textContent = `A few feet away`;
    } else {
        dist.textContent = `${loc.distance} mi away`;
    }
    const charge = document.createElement('p');
    charge.classList.add('loc-charge');
    charge.textContent = `${loc.charge}% Remaining - ${loc.chargeTime} min required`;

    const res = document.createElement('button');
    res.classList.add('loc-res');
    res.textContent = 'Reserve Now!';

    res.onclick = () => {
        const url = `https://google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
        window.open(url);
    }

    row.appendChild(name);
    row.appendChild(dist);
    row.appendChild(charge);
    row.appendChild(res);

    return row;
}

window.onload = () => {
    const locHolder = document.querySelector('#locations')!;
    const rows = locs.map(l => createRow(l));
    rows.forEach(r => {
        locHolder.appendChild(r);
    });
}