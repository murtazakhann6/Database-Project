const fs = require('fs');
const code = fs.readFileSync('./frontend/scripts/data.js', 'utf8');

// evaluate the mockData
eval(code.replace('const mockData', 'mockData'));

// Simulate main.js top providers logic
const usersMap = {};
mockData.users.forEach(u => usersMap[u.user_id] = u);

const providersContainerHtml = [];
mockData.provider_profile.slice(0, 4).forEach((p, index) => {
    const user = usersMap[p.user_id] || {};
    const name = p.business_name || user.full_name || 'Provider';
    providersContainerHtml.push({
        name,
        provider_id: p.provider_id,
        href: `provider.html?id=${p.provider_id}`
    });
});

console.log("HOME PAGE LINKS GENERATED:");
console.log(providersContainerHtml);

// Simulate provider.html logic for the first provider link
const firstId = providersContainerHtml[0].provider_id;
console.log("\nSIMULATING CLICK ON:", firstId);

const provider = mockData.provider_profile.find(p => String(p.provider_id) === String(firstId));
console.log("FOUND PROVIDER?:", !!provider);
if (provider) {
    console.log("PROVIDER DATA:", provider);
} else {
    console.log("FAILED TO FIND PROVIDER. Checking all provider IDs:");
    console.log(mockData.provider_profile.map(p => p.provider_id));
}
