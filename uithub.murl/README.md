## uithub.murl:

Service to charge a user with a more scoped down budget, rather than a full access-token.

1. **Create Budget Context**:

   ```
   POST /budget
   ```

   - **Request Body**:
     ```json
     {
       "maxBudget": 0.25,
       "requestId": "req_12345",
       "owner": "user123"
     }
     ```
   - **Request Headers**:
     - `Authorization`: Token for the murl service
   - **Response**:
     ```json
     {
       "budgetId": "bud_67890",
       "url": "https://uithub.murl/budget/bud_67890",
       "remaining": 0.25
     }
     ```

2. **Check Budget Status**:

   ```
   GET /budget/{budgetId}
   ```

   - **Response**:
     ```json
     {
       "budgetId": "bud_67890",
       "maxBudget": 0.25,
       "remaining": 0.18,
       "transactions": [
         {
           "module": "ingestzip",
           "amount": 0.05,
           "timestamp": "2025-04-21T14:30:00Z"
         },
         {
           "module": "ziptree",
           "amount": 0.02,
           "timestamp": "2025-04-21T14:30:05Z"
         }
       ],
       "status": "active"
     }
     ```

3. **Withdraw from Budget**:

   ```
   POST /budget/{budgetId}/withdraw
   ```

   - **Request Body**:
     ```json
     {
       "amount": 0.05,
       "module": "uithub.search",
       "operation": "indexing"
     }
     ```
   - **Request Headers**:
     - `Authorization`: Token for the module making the withdrawal
   - **Response**:
     ```json
     {
       "budgetId": "bud_67890",
       "transactionId": "txn_12345",
       "previousRemaining": 0.18,
       "newRemaining": 0.13,
       "status": "approved"
     }
     ```

4. **Close Budget** (optional, to finalize and prevent further withdrawals):
   ```
   POST /budget/{budgetId}/close
   ```
   - **Response**:
     ```json
     {
       "budgetId": "bud_67890",
       "status": "closed",
       "remaining": 0.13,
       "refunded": true
     }
     ```
