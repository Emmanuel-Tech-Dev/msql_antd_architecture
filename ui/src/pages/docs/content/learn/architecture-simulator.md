---
id: architecture-simulator
title: Architecture simulator
track: learn
group: Deep dives
order: 5
eyebrow: Framework Load Lab
audience: Developers and operators
readTime: 12 min
summary: Trace any framework hook through the real files it touches, break one thing on purpose, and put the whole architecture under load with the limits from the code.
---

The Framework Load Lab draws the framework as it is: every box is a real file in `ui/src/core` or `server/`, and every hook takes the path it takes in the code. Nothing calls the API or touches data; the paths, error codes and limits are copied from the source.

::architecture-simulator Framework Load Lab

:::note Trace one hook
Click a hook on the left. One dot walks its path and only that path lights up; the trace panel lists each file with what it does there and how many queries it runs, then the response. Use ◀ and ▶ to step, or click any step. Compare useList (all the way to MySQL), useLogin (skips authMiddleWare), useCan (never leaves the browser) and useAuthorizationEvents (starts on the server and arrives over the socket).
:::

:::note Break something
The toolbar changes every path: an expired access token is refreshed and retried by apiClient; signing everyone out bumps token_version so the refresh fails; a role without the resource stops at authorization; an ABAC rule stops at AbacEngine; a sensitive table stops at validateTable; an invalid field value stops writes at the metadata services; changing a role clears the permission cache and pushes access:changed.
:::

:::note Put it under load
Switch hooks on, set the users and how often they call hooks, and press play. Every request follows its hook's real path. The model uses the limits in the code: 3000 requests per 15 minutes per address and 500 per signed-in user (try "All users behind one office IP"), a MySQL pool of 10 connections, a 5-minute permission cache, table schemas cached for 5 minutes, about 1 + 0–4 queries before the data query, and React Query refetching on every mount.
:::

:::note Explore the map
Drag the canvas to pan, scroll to zoom, drag boxes to rearrange them and hover a file to see its connections. Click a file for what it does, the hooks that pass through it and the files it connects to. Focus canvas hides the side panels. Missions ask which file answers a question; click the box you think it is.
:::

:::warning Simulation boundary
Traffic, timings and counts are modelled, not measured. Use them to understand where work happens and what limits it, then measure the real system before changing a limit.
:::
