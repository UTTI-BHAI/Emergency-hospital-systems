const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// In-memory data
let messages = [];
let patients = [];
let patientIdCounter = 1;

const hospitals = [
  {
    id: 1,
    name: "Hospital A",
    distance: 2,
    doctors: [
      { id: 1, name: "Dr A1", specialization: "cardiac", experience: 5, status: "available" },
      { id: 2, name: "Dr A2", specialization: "cardiac", experience: 8, status: "available" },
    ],
  },
  {
    id: 2,
    name: "Hospital B",
    distance: 5,
    doctors: [
      { id: 3, name: "Dr B1", specialization: "cardiac", experience: 10, status: "available" },
    ],
  }
];

// GET DOCTOR INFO BY ID
app.get("/doctor/:id", (req, res) => {
  const doctorId = parseInt(req.params.id);
  let foundDoctor = null;
  let foundHospital = null;

  hospitals.forEach((h) => {
    h.doctors.forEach((d) => {
      if (d.id === doctorId) {
        foundDoctor = d;
        foundHospital = h;
      }
    });
  });

  if (foundDoctor) {
    res.json({ doctor: foundDoctor, hospital: foundHospital });
  } else {
    res.json({ doctor: null, hospital: null });
  }
});

// SUBMIT EMERGENCY
app.post("/emergency", (req, res) => {
  const data = req.body;

  let candidates = [];

  hospitals.forEach((hospital) => {
    hospital.doctors.forEach((doc) => {
      if (doc.specialization === data.type && doc.status === "available") {
        candidates.push({
          doctor: doc,
          hospital: hospital
        });
      }
    });
  });

  let assignedDoctor = null;

  if (candidates.length > 0) {
    let minDistance = Math.min(...candidates.map(c => c.hospital.distance));
    let maxExperience = Math.max(...candidates.map(c => c.doctor.experience));

    let bestScore = -1;

    candidates.forEach(c => {
      let distanceScore = minDistance / c.hospital.distance;
      let experienceScore = c.doctor.experience / maxExperience;

      let finalScore = (distanceScore * 0.6) + (experienceScore * 0.4);

      if (finalScore > bestScore) {
        bestScore = finalScore;
        assignedDoctor = c.doctor;
      }
    });

    // MARK DOCTOR BUSY AUTOMATICALLY
    assignedDoctor.status = "busy";
  }

  const patientId = patientIdCounter++;

  patients.push({
    id: patientId,
    type: data.type,
    severity: data.severity,
    description: data.description,
    doctorId: assignedDoctor ? assignedDoctor.id : null,
    status: "pending" // Patient starts as pending until doctor accepts
  });

  res.json({
    patientId,
    doctor: assignedDoctor
  });
});

// ACCEPT PATIENT
app.post("/patient/accept", (req, res) => {
  const { patientId, doctorId } = req.body;
  
  const patient = patients.find(p => p.id === patientId && p.doctorId === doctorId);
  
  if (patient) {
    patient.status = "accepted";
    res.json({ ok: true, patient });
  } else {
    res.json({ ok: false, error: "Patient not found" });
  }
});

// COMPLETE PATIENT (mark as treated)
app.post("/patient/complete", (req, res) => {
  const { patientId, doctorId } = req.body;
  
  const patient = patients.find(p => p.id === patientId && p.doctorId === doctorId);
  
  if (patient) {
    patient.status = "completed";
    res.json({ ok: true, patient });
  } else {
    res.json({ ok: false, error: "Patient not found" });
  }
});

// GET PATIENTS FOR DOCTOR
app.get("/doctor/patients/:id", (req, res) => {
  const doctorId = parseInt(req.params.id);

  res.json({
    patients: patients.filter((p) => p.doctorId === doctorId)
  });
});

// UPDATE DOCTOR STATUS
app.post("/doctor/status", (req, res) => {
  const { doctorId, status } = req.body;

  hospitals.forEach((h) => {
    h.doctors.forEach((d) => {
      if (d.id === doctorId) {
        d.status = status;
      }
    });
  });

  res.json({ ok: true });
});

// GET SINGLE PATIENT
app.get("/patient/:id", (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find((p) => p.id === patientId);

  res.json(patient || null);
});

// SEND MESSAGE
app.post("/message", (req, res) => {
  messages.push({
    patientId: req.body.patientId,
    from: req.body.from,
    text: req.body.text
  });

  res.json({ ok: true });
});

// GET MESSAGES
app.get("/messages/:id", (req, res) => {
  const patientId = parseInt(req.params.id);

  res.json({
    messages: messages.filter((m) => m.patientId === patientId)
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});