const { GraphQLError } = require('graphql');
const Author = require('../models/author');
const Book = require('../models/book');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/config');

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments({}),
    authorCount: async () => Author.collection.countDocuments({}),
    allBooks: async (root, args) => {
      let query = {};

      if (args.author) {
        const findAuthor = await Author.findOne({ name: args.author });
        if (findAuthor) {
          query.author = findAuthor._id;
        }
      }

      if (args.genre) {
        query.genres = { $in: [args.genre] };
      }

      // VERY IMPORTANT! The .populate('author') is needed so that GraphQL query can access the book's author! Without it, the result of GQL query for Book.author would be null
      const books = await Book.find(query).populate('author');
      return books;
    },
    // allBooks: async () => Book.find({}).populate('author'),
    allAuthors: async () => Author.find({}),
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Author: {
    bookCount: (root) => Book.collection.countDocuments({ author: root.name }),
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const authorAlreadyExist = await Author.findOne({ name: args.author });
      if (!authorAlreadyExist) {
        const newAuthor = new Author({
          name: args.author,
        });

        try {
          await newAuthor.save();
        } catch (error) {
          throw new GraphQLError('Saving author failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.author,
              error,
            },
          });
        }
      }

      const newBook = new Book({ ...args, author: authorAlreadyExist ? authorAlreadyExist : newAuthor });
      try {
        await newBook.save();
      } catch (error) {
        throw new GraphQLError('Saving book failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.title,
            error,
          },
        });
      }
      return newBook;
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const isAuthorExist = await Author.findOne({ name: args.name });
      if (!isAuthorExist) return null;

      const updatedAuthor = { ...args, born: args.setBornTo };

      const response = await Author.findByIdAndUpdate(
        isAuthorExist.id,
        updatedAuthor,
        {
          new: true,
          runValidators: true,
          context: 'query',
        }
      );

      return response;
    },

    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      return user.save().catch((error) => {
        throw new GraphQLError('Create new user failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error,
          },
        });
      });
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== 'secret') {
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, JWT_SECRET) };
    },
  },
};

module.exports = {
  resolvers,
};
