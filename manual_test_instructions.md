# Manual Test Instructions for Task Status Reordering

## Steps to Test:

1. Open your browser and navigate to: http://localhost:3000/clients/5/jobs/21
2. Login with: test@example.com / testpassword
3. Open the browser Developer Console (F12)
4. Click on a task's status button (the emoji)
5. Select a different status (e.g., change from "New" to "In Progress")

## What to Look For in the Console:

You should see these console logs:
- `Updating task [ID] status to [new_status]`
- `Response received: {status: 200, contentType: ..., ok: true}`
- If Turbo Stream: `Processing Turbo Stream response...`
- If Turbo Stream: `Turbo Stream HTML: <turbo-stream action="update"...`
- If Turbo Stream: `Turbo Stream processed`

## Check the Rails Server Logs:

Look for these in the terminal running Rails server:
- `=== TasksController#update ===`
- `Request format: ...`
- `Accept header: text/vnd.turbo-stream.html, application/json`
- `=== render_task_list_update called ===`
- `Tasks tree has X root tasks`
- `Turbo Stream response: <turbo-stream action="update"...`

## Expected Behavior:

1. The status emoji should change immediately ✓
2. The dropdown should close immediately ✓
3. Tasks should reorder based on status priority:
   - In Progress (🟢) → top
   - Paused (⏸️) → second
   - New (⚫) → third
   - Successfully Completed (☑️) → fourth
   - Cancelled (❌) → bottom

## If Reordering Doesn't Work:

Check for:
1. Any JavaScript errors in the console
2. Network tab - is the response actually a Turbo Stream?
3. Elements tab - is the #tasks-list element being updated?
4. Any errors in the Rails server logs