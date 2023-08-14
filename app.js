const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json()); //Middle-Ware

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjToResponseObj = (dbObject) => ({
  stateId: dbObject.state_id,
  stateName: dbObject.state_name,
  population: dbObject.population,
});

const districtObjToResponseObj = (dbObject) => ({
  districtId: dbObject.district_id,
  districtName: dbObject.district_name,
  stateId: dbObject.state_id,
  cases: dbObject.cases,
  cured: dbObject.cured,
  active: dbObject.active,
  deaths: dbObject.deaths,
});

// 1. Returns a list of all states in the state table API
app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state ORDER BY state_id;`;
  const statesList = await db.all(getStatesQuery);
  //console.log(statesList);
  response.send(
    statesList.map((eachObj) => convertDbObjToResponseObj(eachObj))
  );
});

// 2. Returns a state based on the state ID API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  const stateArr = [];
  stateArr.push(state);
  const result = stateArr.map((eachObj) => convertDbObjToResponseObj(eachObj));

  //console.log(stateArr);
  response.send(...result);
});

// 3. Create a district in the district table, district_id is auto-incremented API
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const postDistrictQuery = `INSERT INTO district
                                (district_name,state_id,cases,cured,active,deaths)
                                VALUES
                                    ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  const dbResponse = await db.run(postDistrictQuery);
  const lastId = dbResponse.lastID;
  response.send("District Successfully Added");
});

// 4. Returns a district based on the district ID API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const districtObj = await db.get(getDistrictQuery);
  const districtArr = [];
  districtArr.push(districtObj);
  const result = districtArr.map((eachObj) =>
    districtObjToResponseObj(eachObj)
  );
  response.send(...result);

  //console.log(result);
});

// 5. Deletes a district from the district table based on the district ID API
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `DELETE FROM district WHERE district_id=${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

// 6. Updates the details of a specific district based on the district ID API
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const putDistrictQuery = `UPDATE district 
                                SET
                                   district_name = "${districtName}",
                                   state_id = ${stateId},
                                   cases = ${cases},
                                   cured = ${cured},
                                   active = ${active},
                                   deaths = ${deaths} ;
                                WHERE district_id = ${districtId}`;
  await db.run(putDistrictQuery);
  response.send("District Details Updated");
});

// 7. Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `SELECT  
                                SUM(cases),
                                SUM(cured),
                                SUM(active),
                                SUM(deaths)

                        FROM district 
                            
                        WHERE state_id = ${stateId};`;

  const state = await db.get(statsQuery);
  console.log(state);
  response.send({
    totalCases: state["SUM(cases)"],
    totalCured: state["SUM(cured)"],
    totalActive: state["SUM(active)"],
    totalDeaths: state["SUM(deaths)"],
  });
});

// 8. Returns an object containing the state name of a district based on the district ID API
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `SELECT state.state_name
                                FROM state INNER JOIN district ON
                                district.state_id = state.state_id
                                WHERE district.district_id = ${districtId};`;
  const stateObj = await db.get(getStateNameQuery);
  response.send({
    stateName: stateObj["state_name"],
  });
});

module.exports = app;
