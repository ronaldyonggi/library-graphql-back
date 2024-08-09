const typeDefs = `#graphql
  type Book {
    title: String!
    author: Author!
    published: Int!
    genres: [String!]!
    id: ID!
  }
  
  type Author {
    name: String!
    bookCount: Int!
    born: Int
    id: ID!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
    favoriteGenre: String!
    username: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]
    allAuthors: [Author!]
    me: User
  }

  type Mutation {
    addBook (
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book

    deleteBook(id: ID!): Boolean

    editAuthor (
      name: String!
      setBornTo: Int!
    ): Author

    deleteAuthor(id: ID!): Boolean

    createUser(
      username: String!
      favoriteGenre: String!
    ): User

    login (
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`;

module.exports = {
  typeDefs,
};
