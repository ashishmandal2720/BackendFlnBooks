const swaggerAutogen = require("swagger-autogen")();
const PORT = process.env.PORT || 5000;
const HOST ='localhost';
const doc = {
  info: {
    description: `<div><h2>HTTP Methods Overview</h2><table>
        <thead>
            <tr>
                <th>Method</th>
                <th>Description</th>
                <th>Usage Example</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><span class="method get">GET</span></td>
                <td>Retrieve data from a server.</td>
                <td><code>GET /api/users</code></td>
            </tr>
            <tr>
                <td><span class="method post">POST</span></td>
                <td>Send data to the server to create a new resource.</td>
                <td><code>POST /api/users</code></td>
            </tr>
            <tr>
                <td><span class="method put">PUT</span></td>
                <td>Update an existing resource or create one if it does not exist.</td>
                <td><code>PUT /api/users/1</code></td>
            </tr>
            <tr>
                <td><span class="method delete">DELETE</span></td>
                <td>Delete a resource from the server.</td>
                <td><code>DELETE /api/users/1</code></td>
            </tr>
        </tbody>
    </table></div>`,
    version: "1.0.0",
    title: "Text Book Corporation",
    termsOfService: "http://vsk.cg.gov.in/",
    contact:{
      email: "iitbhilai100@gmail.com"
    },
    license:{
      name: "Apache 2.0",
      url: "http://www.apache.org/licenses/LICENSE-2.0.html"
    }
  },
  host: `${HOST}:${PORT}`,
  basePath: "/api/v1",
  schemes: ["http"],
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    // { name: "Auth", description: "Authentication routes" },
    // { name: "Users", description: "User management routes" },
    // { name: "Publishers", description: "Publisher management routes" },
    // { name: "Subjects", description: "Create, update, delete subjects" },
    
    // { 
    //   name: "Assign Subjects", 
    //   description: "Assign Books (Subjects) to publisher and retrieve data from assigned publisher" 
    // },
    // { name: "Books", description: "Create, update, delete Books" },
    // { name: "Assign Books", description: "Create, update, delete Books Assign" },
    // { name: "Status", description: "Backend Status" }
  ],

  securityDefinitions: {
    Bearer: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Enter your Bearer token in the format **Bearer <token>**"
    }
  }
};

const outputFile = "./docs/api.json"; // Generated file
const endpointsFiles = ["./routes/router.js"]; // Route files

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("Swagger JSON generated successfully!");
});
