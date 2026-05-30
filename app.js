const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function generateToken() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function addDriver() {
    const driverName = prompt("Enter driver name:");
    if (!driverName) return;

    const phoneNumber = prompt("Enter phone number:");
    const token = generateToken();

    const { error } = await supabaseClient.from("drivers").insert({
        driver_name: driverName,
        phone_number: phoneNumber,
        driver_token: token,
        status: "Active"
    });

    if (error) {
        alert("Error adding driver: " + error.message);
        return;
    }

    alert("Driver added successfully.");
    loadDrivers();
}

async function addVehicle() {
    const plateNo = prompt("Enter plate number:");
    if (!plateNo) return;

    const vehicleType = prompt("Enter vehicle type:");
    const rentalCompany = prompt("Enter rental company:");

    const { error } = await supabaseClient.from("vehicles").insert({
        plate_no: plateNo,
        vehicle_type: vehicleType,
        rental_company: rentalCompany,
        status: "Active"
    });

    if (error) {
        alert("Error adding vehicle: " + error.message);
        return;
    }

    alert("Vehicle added successfully.");
    loadVehicles();
}

async function loadDrivers() {
    const table = document.getElementById("driversTable");
    if (!table) return;

    const { data, error } = await supabaseClient
        .from("drivers")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        table.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="4">No drivers yet</td></tr>`;
        return;
    }

    table.innerHTML = data.map(driver => {
        const link = `${window.location.origin}/doms/driver.html?token=${driver.driver_token}`;

        return `
        <tr>
            <td>${driver.driver_name}</td>
            <td>${driver.phone_number || "-"}</td>
            <td>${driver.status}</td>
            <td>
                <input value="${link}" readonly style="width:300px;">
                <button onclick="copyText('${link}')">Copy</button>
            </td>
        </tr>`;
    }).join("");
}

async function loadVehicles() {
    const table = document.getElementById("vehiclesTable");
    if (!table) return;

    const { data, error } = await supabaseClient
        .from("vehicles")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        table.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="4">No vehicles yet</td></tr>`;
        return;
    }

    table.innerHTML = data.map(vehicle => `
        <tr>
            <td>${vehicle.plate_no}</td>
            <td>${vehicle.vehicle_type}</td>
            <td>${vehicle.rental_company || "-"}</td>
            <td>${vehicle.status}</td>
        </tr>
    `).join("");
}

async function loadMovements() {
    const table = document.getElementById("movementsTable");
    if (!table) return;

    const { data, error } = await supabaseClient
        .from("movement_updates")
        .select(`
            *,
            drivers(driver_name),
            vehicles(plate_no)
        `)
        .order("id", { ascending: false });

    if (error) {
        table.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="6">No records yet</td></tr>`;
        return;
    }

    table.innerHTML = data.map(row => `
        <tr>
            <td>${row.drivers?.driver_name || "-"}</td>
            <td>${row.vehicles?.plate_no || "-"}</td>
            <td>${row.activity || "-"}</td>
            <td>${row.location || "-"}</td>
            <td>${row.destination || "-"}</td>
            <td>${new Date(row.created_at).toLocaleString()}</td>
        </tr>
    `).join("");
}

function copyText(text) {
    navigator.clipboard.writeText(text);
    alert("Driver link copied.");
}

document.addEventListener("DOMContentLoaded", function () {
    loadDrivers();
    loadVehicles();
    loadMovements();
});
