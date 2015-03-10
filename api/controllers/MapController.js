var _ = require('lodash');

module.exports = {
  bbox: function(req, res) {

    // Creates a new bounding box object.
    // See api/services/BoundingBox.js.
    var bbox = BoundingBox.fromString(req.query.bbox);
    if (bbox.error) {
      return res.badRequest(bbox.error);
    }

    // Calculate the tiles within this bounding box.
    // See api/services/QuadTile.js.
    var tiles = _.map(QuadTile.tilesForArea(bbox), function(tile) {
      return '' + tile;
    });

    // Query the node table for nodes with this tile.
    Nodes.find({ tile: tiles }).exec(function nodeResp(err, nodes) {
      if (err) {
        return res.badRequest(err);
      }

      // If no nodes are found, just return an empty XML document.
      else if (!nodes.length) {
        res.set('Content-Type', 'text/xml');
        return res.send('<osm version="6" generator="DevelopmentSeed"></osm>');
      }
      else {

        // Create a list of node ID's.
        var nodeIDs = _.pluck(nodes, 'node_id');

        // Query the way_nodes endpoint, returning every wayNode containing our nodes.
        Way_Nodes.find({ node_id: nodeIDs }).exec(function wayNodeResp(err, wayNodes) {
          if (err) {
            return res.badRequest(err);
          }

          // Get a unique list of way ID's
          var wayIDs = _(wayNodes).pluck('way_id').uniq().value();

          // Perform two separate db queries now using our unique way ID's.
          async.parallel({

            // First query returns the actual ways.
            ways: function(cb) {
              Ways.find({ way_id: wayIDs }).exec(cb);
            },

            // Second query hits way_nodes table again
            // to get any *nodes* that aren't in our BBox,
            // but are part of a way.
            wayNodes: function(cb) {
              Way_Nodes.find({ way_id: wayIDs }).exec(cb);
            }
          }, function wayResp(err, resp) {
            if (err) {
              return res.badRequest(err);
            }
            var allNodeIDs = _(resp.wayNodes).pluck('node_id').uniq().value();
            var missingNodes = _.difference(allNodeIDs, nodeIDs);
            var ways = attachNodeIDs(resp);
            var xmlDoc;

            // Need to hit the Nodes server again.
            if (missingNodes.length) {
              Nodes.find({ node_id: missingNodes }).exec(function missingNodeResp(err, missingNodes) {
                nodes = nodes.concat(missingNodes);
                xmlDoc = XML.write({bbox: bbox, nodes: nodes, ways: ways});
                res.set('Content-Type', 'text/xml');
                return res.send(xmlDoc.toString());
              });
            }

            // We have all the nodes, write the output.
            else {
              xmlDoc = XML.write({bbox: bbox, nodes: nodes, ways: ways});
              res.set('Content-Type', 'text/xml');
              return res.send(xmlDoc.toString());
            }
          });
        });
      }
    });
  }
};

function attachNodeIDs(obj) {
  var ways = obj.ways;
  var wayNodes = obj.wayNodes;
  // For each way, attach every node it contains using the wayNodes server response.
  for (var j = 0, jj = ways.length; j < jj; ++j) {
    var way = ways[j];
    var nodesInWay = [];
    for (var i = 0, ii = wayNodes.length; i < ii; ++i) {
      var wayNode = wayNodes[i];
      if (wayNode.way_id === way.way_id) {
        nodesInWay.push(wayNode);
      }
    }
    way.nodes = nodesInWay;
  }
  return ways;
}
