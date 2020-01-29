/* eslint-env node */

import { graphql } from '@octokit/graphql'
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 900 })

const dev = process.env.NODE_ENV === 'development'

export default async (_, res) => {
  if (!process.env.GITHUB_TOKEN) {
    res.status(200).json({ issues: [] })
  } else {
    if (cache.get('issues')) {
      if (dev) console.log('Using cache for "issues"')

      res.status(200).json({ issues: cache.get('issues') })
    } else {
      console.log('Not using cache for "issues"')
    }

    try {
      const { repository } = await graphql(
        `
          {
            repository(owner: "iterative", name: "dvc") {
              issues(last: 3, states: OPEN) {
                edges {
                  node {
                    title
                    createdAt
                    url
                    comments {
                      totalCount
                    }
                  }
                }
              }
            }
          }
        `,
        {
          headers: {
            authorization: `token ${process.env.GITHUB_TOKEN}`
          }
        }
      )

      const issues = repository.issues.edges.map(({ node }) => ({
        title: node.title,
        url: node.url,
        comments: node.comments.totalCount,
        date: node.createdAt
      }))

      cache.set('issues', issues)

      res.status(200).json({ issues })
    } catch (e) {
      res.status(404)
    }
  }
}