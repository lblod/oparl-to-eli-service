import { app, query } from 'mu';
import { ErrorRequestHandler } from 'express';
import Router from 'express-promise-router';
import bodyParser from 'body-parser';
import oparlRoutes from './routes/oparl';
import { OPARL_JSON_LD_CONTEXT } from "./constants";

const requiredEnv = ['OPARL_ENDPOINT'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1); // Exit app with failure
  }
});

const router = Router();
app.use(
  bodyParser.json({
    limit: '500mb',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: function (req: any) {
      return /^application\/json/.test(req.get('content-type') as string);
    },
  }),
);

app.use(router);
app.get('/status', function (req, res) {
  res.send({
    service: 'oparl-to-eli-service',
    status: 'ok',
  });
});

app.get('/oparl', (req, res) => {
  res.redirect('/oparl/System');
});

app.get("/context.jsonld", (req, res) => {
  res.type("application/ld+json");
  res.json(OPARL_JSON_LD_CONTEXT);
});

app.use('/oparl', oparlRoutes);

const errorHandler: ErrorRequestHandler = function (err, _req, res, _next) {
  // custom error handler to have a default 500 error code instead of 400 as in the template
  res.status(err.status || 500);
  res.json({
    errors: [{ title: err.message, description: err.description?.join('\n') }],
  });
};
app.use(errorHandler);
