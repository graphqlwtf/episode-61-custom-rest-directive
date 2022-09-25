import { createServer } from "@graphql-yoga/node";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { mapSchema, getDirective, MapperKind } from "@graphql-tools/utils";
import { fetch } from "undici";
import { GraphQLSchema, GraphQLError } from "graphql";

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    directive @rest(url: String) on FIELD_DEFINITION

    type Post {
      id: Int!
      title: String
      body: String
      userId: String
    }

    type Query {
      posts: [Post] @rest(url: "https://jsonplaceholder.typicode.com/posts")
    }
  `,
});

const restSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const restDirective = getDirective(schema, fieldConfig, "rest")?.[0];

      if (restDirective) {
        const { url } = restDirective;

        fieldConfig.resolve = async () =>
          await fetch(url).then((res) => {
            if (!res.ok) {
              throw new GraphQLError(
                `Couldn't fetch from '${url}' right now. Error code ${res.status}`
              );
            }

            return res.json();
          });
        return fieldConfig;
      }
    },
  });

const server = createServer({
  maskedErrors: false,
  schema: restSchemaTransformer(schema),
});

server.start();
