# README

## how to kill the rails server

```bash
kill $(lsof -ti:3000) 2>/dev/null || kill -9 $(lsof -ti:3000)
```
