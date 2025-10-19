import { jest } from '@jest/globals';
import dotenv from 'dotenv';

import { token } from './coze.js';

beforeAll(() => {
    dotenv.config({ override: true, path: [".env.local", ".env"] });
});

describe('token', () => {
    it('should return a jwt token', async () => {
        // const ctx = {
        //     response: {
        //         body: null
        //     }
        // };
        // await token(ctx);
        // expect(ctx.response.body).not.toBeNull();
    });
});