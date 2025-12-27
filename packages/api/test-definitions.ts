
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testdefinitions() {
    console.log("Starting Definition API Tests...");

    const testId = "test-def-" + Date.now();
    const testDef = {
        id: testId,
        name: "Test Definition",
        description: "Automated test definition",
        definition: {
            id: testId,
            steps: [{ id: "step1", type: "TASK", provider: "AWS", functionId: "test" }]
        }
    };

    try {
        // 1. Create
        console.log(`1. Creating definition ${testId}...`);
        const resCreate = await fetch(`${API_URL}/definitions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testDef)
        });

        if (!resCreate.ok) throw new Error(`Create failed: ${resCreate.status} ${await resCreate.text()}`);
        console.log("   Create OK");

        // 2. List
        console.log("2. Listing definitions...");
        const resList = await fetch(`${API_URL}/definitions`);
        if (!resList.ok) throw new Error(`List failed: ${resList.status}`);
        const list = await resList.json();
        const found = list.find((d: any) => d.id === testId);
        if (!found) throw new Error("Created definition not found in list");
        console.log("   List OK, found item");

        // 3. Get
        console.log("3. Getting definition...");
        const resGet = await fetch(`${API_URL}/definitions/${testId}`);
        if (!resGet.ok) throw new Error(`Get failed: ${resGet.status}`);
        const got = await resGet.json();
        if (got.id !== testId) throw new Error("Get returned wrong ID");
        console.log("   Get OK");

        // 4. Delete
        console.log("4. Deleting definition...");
        const resDel = await fetch(`${API_URL}/definitions/${testId}`, { method: 'DELETE' });
        if (!resDel.ok) throw new Error(`Delete failed: ${resDel.status}`);
        console.log("   Delete OK");

        // 5. Verify Delete
        console.log("5. Verifying deletion...");
        const resGet2 = await fetch(`${API_URL}/definitions/${testId}`);
        if (resGet2.status !== 404) throw new Error(`Expected 404 after delete, got ${resGet2.status}`);
        console.log("   Deletion Verified");

        console.log("\nSUCCESS: All tests passed!");

    } catch (err: any) {
        console.error("\nFAILURE:", err.message);
        process.exit(1);
    }
}

testdefinitions();
