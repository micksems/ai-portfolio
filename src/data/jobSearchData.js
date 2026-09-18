export const jobSearchData = {
  updatedAt: "18/09/2026 09:03:00 ET",
  jobs: [
    ...Array.from({ length: 79 }, (_, i) => ({ company: `Found ${i + 1}`, status: "Found" })),
    ...Array.from({ length: 20 }, (_, i) => ({ company: `Ready ${i + 1}`, status: "Ready to Submit" })),
    ...Array.from({ length: 10 }, (_, i) => ({ company: `Applied ${i + 1}`, status: "Applied" })),
    { company: "Gartner", status: "Interview" },
    ...Array.from({ length: 6 }, (_, i) => ({ company: `Rejected ${i + 1}`, status: "Rejected" })),
    ...Array.from({ length: 2 }, (_, i) => ({ company: `On Hold ${i + 1}`, status: "On Hold" }))
  ]
};
