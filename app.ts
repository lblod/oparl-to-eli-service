import { app, query, errorHandler } from 'mu';

app.get('/status', function( req, res ) {
  res.send({
    service: "harvesting-oparl-scraper-service",
    status: "ok",
  });
} );

app.use(errorHandler);
