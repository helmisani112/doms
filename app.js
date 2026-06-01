const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentDriver = null;

function generateToken() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getTokenFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

/* ADMIN LOGIN */

async function adminLogin() {
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;

    const { data, error } = await supabaseClient
        .from("admin_users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

    if (error || !data) {
        alert("Invalid username or password");
        return;
    }

    sessionStorage.setItem("doms_admin", "true");
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("adminContent").style.display = "block";

    loadDrivers();
    loadVehicles();
    loadMovements();
}

function adminLogout() {
    sessionStorage.removeItem("doms_admin");
    location.reload();
}

function checkAdminLogin() {
    const loginBox = document.getElementById("loginBox");
    const adminContent = document.getElementById("adminContent");

    if (!loginBox || !adminContent) return;

    if (sessionStorage.getItem("doms_admin") === "true") {
        loginBox.style.display = "none";
        adminContent.style.display = "block";
        loadDrivers();
        loadVehicles();
        loadMovements();
        
    } else {
        loginBox.style.display = "block";
        adminContent.style.display = "none";
    }
}

/* ADMIN FUNCTIONS */

async function addDriver() {
    const driverName = prompt("Enter driver name:");
    if (!driverName) return;

    const phoneNumber = prompt("Enter phone number:");
    const token = generateToken();

    const { error } = await supabaseClient.from("drivers").insert({
        driver_name: driverName,
        phone_number: phoneNumber,
        driver_token: token,
        status: "Off Duty"
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
            <td>${driver.status || "-"}</td>
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
        .order("created_at", { ascending: false });

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

/* DRIVER PAGE */

async function loadDriverPage() {
    const driverNameDisplay = document.getElementById("driverNameDisplay");
    const vehicleSelect = document.getElementById("vehicleSelect");

    if (!driverNameDisplay || !vehicleSelect) return;

    const token = getTokenFromUrl();

    if (!token) {
        driverNameDisplay.textContent = "Invalid link. No driver token found.";
        return;
    }

    const { data: driverData, error: driverError } = await supabaseClient
        .from("drivers")
        .select("*")
        .eq("driver_token", token)
        .single();

    if (driverError || !driverData) {
        driverNameDisplay.textContent = "Invalid or inactive driver link.";
        return;
    }

    currentDriver = driverData;
    driverNameDisplay.textContent = currentDriver.driver_name;

    const { data: vehicles, error: vehicleError } = await supabaseClient
        .from("vehicles")
        .select("*")
        .eq("status", "Active")
        .order("plate_no", { ascending: true });

    if (vehicleError) {
        vehicleSelect.innerHTML = `<option>Error loading vehicles</option>`;
        return;
    }

    vehicleSelect.innerHTML = vehicles.map(vehicle => `
        <option value="${vehicle.id}">
            ${vehicle.plate_no} - ${vehicle.vehicle_type}
        </option>
    `).join("");
}

async function submitDriverUpdate(event) {
    event.preventDefault();

    if (!currentDriver) {
        alert("Invalid driver link.");
        return;
    }

    const vehicleId = document.getElementById("vehicleSelect").value;
    const driverStatus = document.getElementById("driverStatus").value;
    const activity = document.getElementById("activity").value;
    const location = document.getElementById("location").value;
    const destination = document.getElementById("destination").value;
    const passengerCount = document.getElementById("passengerCount").value || 0;
    const passengerName = document.getElementById("passengerName").value;
    const remarks = document.getElementById("remarks").value;

    const tyreOk = document.getElementById("tyreOk").checked;
    const brakeOk = document.getElementById("brakeOk").checked;
    const lightsOk = document.getElementById("lightsOk").checked;
    const mirrorsOk = document.getElementById("mirrorsOk").checked;
    const hornOk = document.getElementById("hornOk").checked;
    const fireExtinguisherOk = document.getElementById("fireExtinguisherOk").checked;
    const firstAidOk = document.getElementById("firstAidOk").checked;
    const odometer = document.getElementById("odometer").value || null;
    const defectFound = document.getElementById("defectFound").value === "true";
    const defectDescription = document.getElementById("defectDescription").value;

    const { error: movementError } = await supabaseClient.from("movement_updates").insert({
        driver_id: currentDriver.id,
        vehicle_id: vehicleId,
        activity: activity,
        location: location,
        destination: destination,
        passenger_count: Number(passengerCount),
        passenger_name: passengerName,
        remarks: remarks
    });

    if (movementError) {
        alert("Error submitting movement update: " + movementError.message);
        return;
    }

    const { error: statusError } = await supabaseClient
        .from("drivers")
        .update({
            status: driverStatus
        })
        .eq("id", currentDriver.id);

    if (statusError) {
        alert("Movement saved, but driver status failed: " + statusError.message);
        return;
    }

    if (activity === "Vehicle Inspection") {
        const { error: inspectionError } = await supabaseClient.from("vehicle_inspections").insert({
            driver_id: currentDriver.id,
            vehicle_id: vehicleId,
            tyre_ok: tyreOk,
            brake_ok: brakeOk,
            lights_ok: lightsOk,
            mirrors_ok: mirrorsOk,
            horn_ok: hornOk,
            fire_extinguisher_ok: fireExtinguisherOk,
            first_aid_ok: firstAidOk,
            odometer: odometer ? Number(odometer) : null,
            defect_found: defectFound,
            defect_description: defectDescription
        });

        if (inspectionError) {
            alert("Movement saved, but inspection failed: " + inspectionError.message);
            return;
        }
    }

    alert("Update submitted successfully.");
    document.getElementById("driverForm").reset();
}

/* DASHBOARD */

async function loadDashboard() {
    const { data: drivers } = await supabaseClient.from("drivers").select("*");
    const { data: vehicles } = await supabaseClient.from("vehicles").select("*");

    const { data: movements } = await supabaseClient
        .from("movement_updates")
        .select(`
            *,
            drivers(driver_name),
            vehicles(plate_no)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

    let onDuty = 0;
    let standby = 0;
    let offDuty = 0;

    if (drivers) {
        drivers.forEach(driver => {
            const status = driver.status || "Off Duty";

            if (status === "On Duty") onDuty++;
            else if (status === "Standby") standby++;
            else offDuty++;
        });
    }

    if (document.getElementById("onDutyCount"))
        document.getElementById("onDutyCount").innerText = onDuty;

    if (document.getElementById("standbyCount"))
        document.getElementById("standbyCount").innerText = standby;

    if (document.getElementById("offDutyCount"))
        document.getElementById("offDutyCount").innerText = offDuty;

    if (document.getElementById("vehicleCount"))
        document.getElementById("vehicleCount").innerText = vehicles ? vehicles.length : 0;

    const table = document.getElementById("activityTable");
    if (!table) return;

    table.innerHTML = "";

    if (!movements || movements.length === 0) {
        table.innerHTML = `<tr><td colspan="6">No records yet</td></tr>`;
        return;
    }

    movements.forEach(record => {
        table.innerHTML += `
        <tr>
            <td>${record.drivers?.driver_name || "-"}</td>
            <td>${record.vehicles?.plate_no || "-"}</td>
            <td>${record.activity || "-"}</td>
            <td>${record.location || "-"}</td>
            <td>${record.destination || "-"}</td>
            <td>${new Date(record.created_at).toLocaleString()}</td>
        </tr>`;
    });
}

/* UTILITY */

function copyText(text) {
    navigator.clipboard.writeText(text);
    alert("Driver link copied.");
}

async function loadInspections() {

    const table = document.getElementById("inspectionTable");

    if (!table) return;

    const { data, error } = await supabaseClient
        .from("vehicle_inspections")
        .select(`
            *,
            drivers(driver_name),
            vehicles(plate_no)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        table.innerHTML =
            `<tr><td colspan="8">${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        table.innerHTML =
            `<tr><td colspan="8">No inspection records found</td></tr>`;
        return;
    }

    table.innerHTML = "";

    data.forEach(record => {

        table.innerHTML += `
        <tr>
            <td>${record.drivers?.driver_name || "-"}</td>
            <td>${record.vehicles?.plate_no || "-"}</td>
            <td>${record.tyre_ok ? "OK" : "Not OK"}</td>
            <td>${record.brake_ok ? "OK" : "Not OK"}</td>
            <td>${record.lights_ok ? "OK" : "Not OK"}</td>
            <td>${record.defect_found ? "Yes" : "No"}</td>
            <td>${record.odometer || "-"}</td>
            <td>${new Date(record.created_at).toLocaleString()}</td>
        </tr>
        `;
    });
}

/* PAGE LOAD */

document.addEventListener("DOMContentLoaded", function () {
    checkAdminLogin();
    loadDriverPage();

    const driverForm = document.getElementById("driverForm");

    if (driverForm) {
        driverForm.addEventListener("submit", submitDriverUpdate);
    }

    if (
        window.location.pathname.includes("index.html") ||
        window.location.pathname.endsWith("/doms/")
    ) {
        loadDashboard();
    }
});
